import { generateId, mapValueChecker, loggers } from "./utils";
import { Player } from "./player";
import { EventEmitter } from "events";

export type RespondCommand<T> = (arg: T, action: string, payload?: any) => void;
export type LobbyConstructor<T = any> = new (id: string, send: RespondCommand<Player>, broadcast: RespondCommand<Lobby>) => T;
export type LobbyEvent = "lobby.init" | "lobby.joined" | "lobby.command" | "lobby.leaved" | "lobby.dispose";

export interface ILobbyPlugin {
  beforeEvent(e: LobbyEvent, ...args: any[]): void;
  afterEvent(e: LobbyEvent, ...args: any[]): void;
}

export interface ILobby {
  id: string;
  plugins: { [key: string]: ILobbyPlugin };

  isInitialized: boolean;
  isFull: boolean;
  isEmpty: boolean;

  event: (e: any, ...args: any[]) => void;
}

export abstract class Lobby implements ILobby {
  plugins = {};

  protected readonly command: RespondCommand<Player>;
  protected readonly broadcast: RespondCommand<Lobby>;

  private readonly _id: string;

  readonly maxPlayers: number = 2;

  // private _lobbyState: SyncState<T> = new SyncState<any>({});
  // private _playerState: Map<string, SyncState<K>> = new Map();

  private _initialized = false;
  get isInitialized() {
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

  /** Перебирает все плагины и вызывает коллбек
   * @param cb функция коллбека
   **/
  private forEachPlugin(cb: (plugin: ILobbyPlugin) => void) {
    for (let k in this.plugins) {
      const p = (this.plugins as any)[k] as ILobbyPlugin;
      cb(p);
    }
  }

  event(event: "lobby.dispose" | "lobby.init"): void;
  event(event: "lobby.command", player: Player, action: string, payload?: any): void;
  event(event: "lobby.joined" | "lobby.leaved", player: Player): void;
  event(event: LobbyEvent, ...args: any[]) {
    // for (let k in this.plugins) {
    //   const p = (this.plugins as any)[k] as ILobbyPlugin;
    //   p.beforeEvent(event, ...args);
    // }
    this.forEachPlugin(p => p.beforeEvent(event, ...args));

    const [player, action, payload] = args;
    switch (event) {
      case "lobby.init":
        this.lobbyInit();
        this.onInit();
        break;
      case "lobby.joined":
        this.playerJoined(player);
        this.onJoined(player);
        break;
      case "lobby.leaved":
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

    this.forEachPlugin(p => p.afterEvent(event, ...args));
  }

  /** Вызывается при присоединении игрока в лобби */
  private playerJoined(player: Player) {
    // Инициализируем лобби, когда первый игрок подключается в него
    if (!this.isInitialized) this.event("lobby.init");
  }
  /** Вызывается при покидании игрока из лобби */
  private playerLeaved(player: Player) {}
  /** Вызывается при уничтожении лобби */
  private lobbyDispose() {}

  protected onInit() {}
  protected onJoined(player: Player) {}
  protected onLeaved(player: Player) {}
  protected onCommand(player: Player, action: string, payload: any) {}
  protected onDisposed() {}

  private lobbyInit() {
    if (this.isInitialized) throw "lobby already initialized";

    // Устанавливаем, что лобби инициализировано
    this._initialized = true;
    // Логгируем, что инициализировались
    loggers.lobby("lobby initialze", this.id);
  }
}

type LobbyManagerEventType = "lobby.broadcast" | "lobby.command";

export class AstraLobbyManager {
  private emitter: EventEmitter = new EventEmitter();
  private lobbies: Map<string, Lobby> = new Map();
  private lobbiesQueue: string[] = [];
  private defaultLobbyType: LobbyConstructor;
  // id игрока -> id лобби
  private connections: Map<string, Lobby> = new Map();

  constructor(defaultLobbyType: LobbyConstructor) {
    this.defaultLobbyType = defaultLobbyType;
  }

  public on = (e: LobbyManagerEventType, cb: (...args: any[]) => void) => {
    this.emitter.on(e, cb);
  };

  public once = (e: LobbyManagerEventType, cb: (...args: any[]) => void) => {
    this.emitter.once(e, cb);
  };

  public removeAllListeners = (e?: LobbyManagerEventType) => {
    this.emitter.removeAllListeners(e);
  };

  public off = (e: LobbyManagerEventType, cb: (...args: any[]) => void) => {
    this.emitter.off(e, cb);
  };

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
    this.emitter.emit("lobby.command", player, action, payload);
  };

  private broadcastCommand = (lobby: Lobby, action: string, payload?: any) => {
    this.emitter.emit("lobby.broadcast", lobby, action, payload);
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
