import { generateId, mapValueChecker } from "./utils";
import { Player } from "./player";
import { EventEmitter } from "events";

export type RespondCommand = (player: Player, action: string, payload?: any) => void;
export type StateChangeCommand<T> = (arg: T, action: string, changes: StatePartial, target?: Player[]) => void;

export abstract class Lobby<T = any, K = any> {
  protected readonly send: RespondCommand;

  private readonly lobbyStateChange: StateChangeCommand<Lobby>;
  private readonly playerStateChange: StateChangeCommand<Player>;

  private readonly _id: string;

  readonly maxPlayers: number;

  abstract readonly createLobbyState: () => SyncState<T>;
  abstract readonly createPlayerState: () => SyncState<K>;

  lobbyState: SyncState<T>;
  readonly playerState: Map<string, SyncState<K>> = new Map();

  private _initialized = false;
  get initialized() {
    return this._initialized;
  }

  get id(): string {
    return this._id;
  }

  players: Player[] = [];

  constructor(id: string, send: RespondCommand, lobbyState: StateChangeCommand<Lobby>, playerState: StateChangeCommand<Player>) {
    this._id = id;
    this.send = send;
    this.lobbyStateChange = lobbyState;
  }

  get isFull(): boolean {
    return this.players.length === this.maxPlayers;
  }
  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  onJoined(player: Player) {
    let state = this.playerState.get(player.id);
    if (!state) {
      state = this.createPlayerState();
      this.playerState.set(player.id, state);
    }

    state.on("state.change", (action: string, changes: StatePartial) => {
      this.playerStateChange(player, action, changes);
    });

    state.fetch("player.state", state.data);
    this.lobbyState.fetch("lobby.state", this.lobbyState.data, player);
  }

  onLeaved(player: Player) {
    const state = this.playerState.get(player.id);
    if (!state) throw "WTF THIS IS THE BUG.";

    state.removeAllListeners("state.change");

    // state.on("state.change", (action: string, changes: StatePartial) => {
    //   this.playerStateChange(player, action, changes);
    // });
  }
  onCommand(player: Player, action: string, payload: any) {}

  onDispose() {
    this.lobbyState.removeAllListeners();
  }

  init() {
    if (this.initialized) throw "lobby already initialized";

    this._initialized = true;
    this.lobbyState = this.createLobbyState();

    this.lobbyState.on("state.change", (action: string, changes: StatePartial, target: Player[]) => {
      this.lobbyStateChange(this, action, changes, target);
    });
  }
}

export type StatePartial<T = any> = {
  [P in keyof T]?: T[P];
};

export class SyncState<T = any> extends EventEmitter {
  data: T;

  constructor(defaultState: T) {
    super();
    this.data = defaultState;
  }

  fetch(label: string, changes: StatePartial<T>, ...target: Player[]) {
    this.data = { ...this.data, ...changes };

    this.emit("state.change", label, changes, target);
  }
}

export interface ITestLobbyState {
  time: number;
}

export class TestLobby extends Lobby<ITestLobbyState> {
  maxPlayers = 10;
  createLobbyState = () => new SyncState({ time: 10 });
  createPlayerState = () => new SyncState({ score: 5 });

  onCommand(player: Player, action: string) {
    if (action === "game.ping") {
      this.send(player, "game.pong");
    }
  }
}

export class AstraLobbyManager extends EventEmitter {
  private lobbies: Map<string, Lobby> = new Map();
  private lobbiesQueue: string[] = [];
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
      if (this.lobbiesQueue.length === 0) this.create(TestLobby);
      // if (this.lobbiesQueue.length === 0) {
      // }

      lobby = this.getLobby(this.lobbiesQueue[0], true);

      if (lobby.isFull) throw "this is the bug.. wtf";
    }
    return this.joinPlayer(player, lobby);
  }

  public command(player: Player, action: string, payload: any) {
    const lobby = this.getConnection(player.id, true);
    lobby.onCommand(player, action, payload);
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

    lobby.onJoined(player);

    return lobby;
  }

  public leave(player: Player, id?: string) {
    let lobby: Lobby;
    if (id !== undefined) {
      lobby = this.getLobby(id, true, l => !l.players.includes(player) && `player not connected to lobby with id <${l.id}>`);
    } else {
      lobby = this.getConnection(player.id, true);
    }
    return { lobby, disposed: this.leavePlayer(player, lobby) };
  }

  // Внутренний метод, кидающий игрока с лобби, возвращает true, если лобби уничтожено, иначе false
  private leavePlayer(player: Player, lobby: Lobby) {
    this.connections.delete(player.id);
    lobby.players = lobby.players.filter(p => p.id !== player.id);

    lobby.onLeaved(player);

    if (!lobby.isEmpty) return false;

    this.dispose(lobby.id);
    return true;
  }

  private respondCommand = (player: Player, action: string, payload?: any) => {
    this.emit("lobby.command", player, action, payload || {});
  };

  private broadcastCommand(lobby: Lobby, action: string, payload?: any) {
    this.emit("lobby.broadcast", lobby, action, payload);
  }

  // Метод, создающий лобби
  public create<T extends Lobby>(LobbyType: new (id: string, send: RespondCommand, lobbyState: StateChangeCommand<Lobby>, playerState: StateChangeCommand<Player>) => T) {
    const lobbyStateChange = (lobby: Lobby, action: string, changes: StatePartial, target: Player[]) => {
      if (!target) this.broadcastCommand(lobby, action, changes);
      else target.forEach(p => this.command(p, action, changes));
    };
    const playerStateChange = (player: Player, action: string, changes: StatePartial) => this.respondCommand(player, action, changes);

    const lobby = new LobbyType(generateId(), this.respondCommand, lobbyStateChange, playerStateChange);
    lobby.init();

    this.lobbies.set(lobby.id, lobby);
    this.lobbiesQueue.push(lobby.id);
    return lobby;
  }
  // Внешняя компанда, вызывающее уничтожение лобби
  public dispose(id: string) {
    const lobby = this.getLobby(id, true);
    return this.disposeLobby(lobby);
  }
  // Возвращает игроков, покинувших лобби при уничтожении
  private disposeLobby(lobby: Lobby) {
    lobby.onDispose();

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
