import { generateId, mapValueChecker, loggers } from "./utils";
import { Player } from "./player";
import { EventEmitter } from "events";
import { StatePartial, SyncState } from "./state";

export type StateChangeMapper<T> = (p: StatePartial<T>, s: T) => any;
export type RespondCommand<T> = (arg: T, action: string, payload?: any) => void;
export type StateChangeCommand<T> = (arg: T, action: string, changes: StatePartial<T>, target?: Player[]) => void;
export type LobbyConstructor<T = any> = new (id: string, send: RespondCommand<Player>, broadcast: RespondCommand<Lobby>) => T;

export abstract class Lobby<T = any, K = any> {
  protected readonly command: RespondCommand<Player>;
  protected readonly broadcast: RespondCommand<Lobby>;

  private readonly _id: string;

  readonly maxPlayers: number = 2;

  readonly createLobbyState: () => T = () => ({} as T);
  readonly createPlayerState: () => K = () => ({} as K);

  getLobbyState = () => {
    return this._lobbyState;
  };

  getPlayerState = (player: Player) => {
    return this._playerState.get(player.id);
  };

  mapPlayerState = (cb: (p: Player, state: SyncState<K>) => void) => {
    this.players.forEach(p => {
      const s = this.getPlayerState(p);
      if (!s) throw `state on player ${p.id} does not exists`;
      cb(p, s);
    });
  };

  private _lobbyState: SyncState<T> = new SyncState<any>({});
  private _playerState: Map<string, SyncState<K>> = new Map();

  private _initialized = false;
  get initialized() {
    return this._initialized;
  }

  get id(): string {
    return this._id;
  }

  players: Player[] = [];

  constructor(id: string, send: RespondCommand<Player>, broadcast: RespondCommand<Lobby>) {
    this._id = id;
    this.command = send;
    this.broadcast = broadcast;
  }

  get isFull(): boolean {
    return this.players.length === this.maxPlayers;
  }
  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  event(event: "lobby.dispose"): void;
  event(event: "lobby.command", player: Player, action: string, payload?: any): void;
  event(event: "lobby.joined" | "lobby.leaved", player: Player): void;
  event(event: string, ...args: any[]) {
    const [player, action, payload] = args;
    switch (event) {
      case "lobby.joined":
        this.playerJoined(player);

        this.onJoined(player);
        break;
      case "lobby.leave":
        this.playerLeaved(player);

        this.onLeaved(player);
        break;
      case "lobby.command":
        this.onCommand(player, action, payload);
        break;
      case "lobby.dispose":
        this.lobbyDispose();
        this.onDisposed();

        break;
    }
  }

  private playerJoined(player: Player) {
    // Инициализируем лобби, когда первый игрок подключается в него
    if (!this.initialized) this.init();

    let state = this._playerState.get(player.id);

    if (!state) {
      const pState = this.createPlayerState();
      state = new SyncState(pState);
      this._playerState.set(player.id, state);
    }

    // state.on("state.change", (action: string, changes: StatePartial) => {
    //   if (!state) throw "state is not initialized";
    //   this.playerStateChange(player, action, changes);
    // });

    // this.send(player, "lobby.players")
    // НЕНУЖНЫ КОНТРОЛЬ РАЗРАБАМ
    // state
    //   .modify()
    //   .public(state.data)
    //   .apply();
    // this._lobbyState
    //   .modify()
    //   .public(this._lobbyState.data)
    //   .apply();
  }
  private playerLeaved(player: Player) {
    const state = this._playerState.get(player.id);
    if (!state) throw "WTF THIS IS THE BUG.";

    // state.disable("state.change");
    // Если надо, чтобы состояние игрока в лобби не сохранялось - раскомментить
    //this._playerState.delete(player.id);

    // state.on("state.change", (action: string, changes: StatePartial) => {
    //   this.playerStateChange(player, action, changes);
    // });
  }
  private lobbyDispose() {
    // this._lobbyState.disable();
  }

  protected onInit() {}
  protected onJoined(player: Player) {}
  protected onLeaved(player: Player) {}
  protected onCommand(player: Player, action: string, payload: any) {}
  protected onDisposed() {}

  private init() {
    if (this.initialized) throw "lobby already initialized";

    this._initialized = true;
    const lState = this.createLobbyState();
    // const mapper = lState.mapper || (s => s);

    this._lobbyState = new SyncState(lState);

    // this._lobbyState.on("state.change", (action: string, changes: StatePartial, target: Player[]) => {
    //   this.lobbyStateChange(this, action, changes, target);
    // });

    loggers.lobby("lobby initialze", this.id);

    // loggers.lobby("lobby initialized", "lobby-" + this.id);
    this.onInit();
  }
}

export class AstraLobbyManager extends EventEmitter {
  private lobbies: Map<string, Lobby> = new Map();
  private lobbiesQueue: string[] = [];
  private defaultLobbyType: LobbyConstructor;
  // id игрока -> id лобби
  private connections: Map<string, Lobby> = new Map();

  // public getLobby(id: string, required?: boolean) {
  //   const lobby = this.lobbies.get(id);
  //   if (required !== undefined) {
  //     if (required && !lobby) throw `lobby with id <${id}> not exists`;
  //     if (!required && lobby) throw `lobby with id <${id}> already exists`;
  //   }

  //   return lobby;
  // }

  constructor(defaultLobbyType: LobbyConstructor) {
    super();
    this.defaultLobbyType = defaultLobbyType;
  }

  public getLobby = mapValueChecker<Lobby>(this.lobbies, id => ({
    exclude: `lobby with id <${id}> not exists`,
    include: `lobby with id <${id}> already exists`
  }));
  public getConnection = mapValueChecker<Lobby>(this.connections, id => ({
    exclude: `player with id <${id}> not connected to lobby`,
    include: `player with id <${id}> already connected to lobby`
  }));

  public join(player: Player, id?: string) {
    let lobby: Lobby;
    if (id !== undefined) {
      lobby = this.getLobby(id, true);
    } else {
      if (this.lobbiesQueue.length === 0) this.create(this.defaultLobbyType);
      // if (this.lobbiesQueue.length === 0) {
      // }

      lobby = this.getLobby(this.lobbiesQueue[0], true);

      if (lobby.isFull) throw "this is the bug.. wtf";
    }
    return this.joinPlayer(player, lobby);
  }

  public command(player: Player, action: string, payload: any) {
    const lobby = this.getConnection(player.id, true);
    try {
      lobby.event("lobby.command", player, action, payload);
    } catch (err) {
      if (typeof err === "string") throw { action, randomId: payload.randomId, error: err };
      else throw err;
    }
    // lobby.onCommand(player, action, payload);
  }

  private joinPlayer(player: Player, lobby: Lobby) {
    if (lobby.isFull) throw "lobby already full";

    lobby.players.push(player);
    // Если после подключение лобби заполнено - удалить его из списка ожидаемых к подключению
    if (lobby.isFull) {
      let id = this.lobbiesQueue.findIndex(l => l === lobby.id);
      if (id !== -1) this.lobbiesQueue.splice(id, 1);
    }

    this.connections.set(player.id, lobby);

    //lobby.onJoined(player);
    // КОСТЫЛЬ УБРАТЬ ЕСЛИ ПОЧИНЮ
    // lobby.event("lobby.joined", player);

    return lobby;
  }

  public leave(player: Player, id?: string) {
    let lobby: Lobby;
    if (id !== undefined) {
      lobby = this.getLobby(id, true, l => (!l.players.includes(player) ? `player not connected to lobby with id <${l.id}>` : null));
    } else {
      lobby = this.getConnection(player.id, true);
    }
    return { lobby, disposed: this.leavePlayer(player, lobby) };
  }

  // Внутренний метод, кидающий игрока с лобби, возвращает true, если лобби уничтожено, иначе false
  private leavePlayer(player: Player, lobby: Lobby) {
    this.connections.delete(player.id);
    lobby.players = lobby.players.filter(p => p.id !== player.id);

    // lobby.onLeaved(player);
    // НЕ КОСТЫЛЬ (?) НЕ ПЕРЕЕЗЖАЕТ
    lobby.event("lobby.leaved", player);

    if (!lobby.isEmpty) {
      this.lobbiesQueue.push(lobby.id);
      return false;
    }

    this.dispose(lobby.id);
    return true;
  }

  private respondCommand = (player: Player, action: string, payload?: any) => {
    this.emit("lobby.command", player, action, payload);
  };

  private broadcastCommand = (lobby: Lobby, action: string, payload?: any) => {
    this.emit("lobby.broadcast", lobby, action, payload);
  };

  // Метод, создающий лобби
  public create<T extends Lobby>(LobbyType: new (id: string, command: RespondCommand<Player>, broadcast: RespondCommand<Lobby>) => T) {
    const lobby = new LobbyType(generateId(), this.respondCommand, this.broadcastCommand);

    this.lobbies.set(lobby.id, lobby);
    this.lobbiesQueue.push(lobby.id);

    loggers.lobby("lobby   created", "lobby-" + lobby.id);
    return lobby;
  }
  // Внешняя компанда, вызывающее уничтожение лобби
  public dispose(id: string) {
    const lobby = this.getLobby(id, true);
    return this.disposeLobby(lobby);
  }
  // Возвращает игроков, покинувших лобби при уничтожении
  private disposeLobby(lobby: Lobby) {
    lobby.event("lobby.dispose");
    // lobby.onDispose();

    // Убираем лобби из списка очереди на подключение
    let lobbyId = this.lobbiesQueue.findIndex(i => i === lobby.id);
    if (lobbyId !== -1) this.lobbiesQueue.splice(lobbyId, 1);

    // Убираем все подключения к лобби
    lobby.players.forEach(p => {
      this.connections.delete(p.id);
    });

    return lobby.players;
    // ЗДЕСЬ НАДО ПОСЛАТЬ ВСЕМ ИГРОКАМ ШО ОНИ ОТРУБИЛИСЬ ОГО ПО СОКЕТАМ ТИПА ОКЕЙ ДА .. . . ООО ПРИДУМАЛ НЕТ НЕ ПРИДУМАЛ
  }
}
