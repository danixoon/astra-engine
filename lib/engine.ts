import * as socketIO from "socket.io";
import { EventEmitter } from "events";
import { Player, PlayerData, AstraPlayerManager } from "./player";
import { AstraSocketManager, ISocketError, ISocketCommand, ISocketErrorPayload } from "./socket";
import { AstraLobbyManager, Lobby, LobbyConstructor } from "./lobby";
import { loggers } from "./utils";

export class AstraEngine {
  readonly socketManager: AstraSocketManager;
  readonly lobbyManager: AstraLobbyManager;
  readonly playerManager: AstraPlayerManager;

  private wrapSocket(func: (...args: any[]) => any) {
    return async (socket: socketIO.Socket, player: Player, payload: any = {}, ...socketArgs: any[]) => {
      try {
        await func(socket, player, payload, ...socketArgs);
      } catch (err) {
        const author = player ? (player.data ? player.data.username || socket.id : socket.id) : socket.id;
        if (typeof err === "string") this.socketManager.error(socket.id, err, author);
        else {
          let e = err as ISocketErrorPayload;
          if (!e || !e.error || typeof e.error !== "string") {
            this.socketManager.error(socket.id, "internal error", author);
            throw err;
          } else this.socketManager.error(socket.id, e.error, author, { data: { ...e, error: undefined } });
        }
      }
    };
  }

  private onSocketConnected(socket: socketIO.Socket, username: string) {
    const { playerManager, socketManager } = this;
    if (playerManager.players.has(username)) throw `player <${username}> already connected`;

    socketManager.command(socket.id, "socket.connected", username);
    const player = playerManager.create(socket, new PlayerData(username));

    this.onPlayerConnected(player);
  }

  private onSocketDisconnected(socket: SocketIO.Socket, reason: string) {
    const { playerManager, socketManager } = this;
    socketManager.command(socket.id, "socket.disconnected", null, { reason });
  }

  private onPlayerConnected(player: Player) {
    const { playerManager, socketManager } = this;

    socketManager.onPlayerConnected(player);
    socketManager.command(player.socket.id, "player.connected", player.data.username, { playerId: player.id });

    // loggers.player("player joined", player.data.username);
  }

  private onPlayerDisconnected(socket: socketIO.Socket, player: Player) {
    const { playerManager } = this;
    playerManager.remove(player.id);

    // Когда отключаемся - также и выходим из лобби
    // ВОЗМОЖНО СЮДА ВПИХНУТЬ TRY-CATCH, чтобы мы точно ливнули | Да, костыль
    try {
      this.onLobbyLeave(socket, player, {});
    } catch (e) {}

    // loggers.player("player leave", player.data.username);
  }

  private onLobbyJoin(socket: socketIO.Socket, player: Player, payload: any) {
    const { playerManager, socketManager, lobbyManager } = this;

    const { lobbyId } = payload || {};
    let lobby = lobbyManager.join(player, lobbyId);

    loggers.lobby("lobby    joined", lobby.id, player.data.username);

    socketManager.joinToLobby(player, lobby.id);
    socketManager.command(lobby.id, "lobby.joined", null, { lobbyId: lobby.id, playerId: player.id, playerIds: lobby.players.map(p => p.id) });

    // НЕБОЛЬШОЙ КОСТЫЛЬ С ПОДПИСКОЙ НА СОКЕТЫ
    lobby.event("lobby.joined", player);
  }

  private onLobbyLeave(socket: socketIO.Socket, player: Player, payload: any) {
    const { playerManager, socketManager, lobbyManager } = this;
    const { lobbyId } = payload;
    const { disposed, lobby } = lobbyManager.leave(player, lobbyId);

    loggers.lobby("lobby    leaved", lobby.id, player.data.username);

    socketManager.command(lobby.id, "lobby.leaved", null, { playerId: player.id, lobbyId: lobby.id });
    socketManager.leaveFromLobby(player, lobby.id);
    if (disposed) loggers.lobby("lobby  disposed", "lobby-" + lobby.id);
  }

  private onPlayerCommand(socket: socketIO.Socket, player: Player, socketPayload: any) {
    const { playerManager, socketManager, lobbyManager } = this;
    const { action, payload } = socketPayload;
    if (!action) throw "invalid action";

    lobbyManager.command(player, action, payload || {});
  }

  private onLobbyCommand(player: Player, action: string, payload: any) {
    const { playerManager, socketManager, lobbyManager } = this;
    socketManager.command(player.socket.id, action, player.data.username, payload);
  }

  private onLobbyBroadcast(lobby: Lobby, action: string, payload: any) {
    const { playerManager, socketManager, lobbyManager } = this;
    socketManager.command(lobby.id, action, "lobby-" + lobby.id, payload); //command(player.socket.id, action, payload);
  }

  private listen = () => {
    const { socketManager, lobbyManager } = this;
    // Когда сокет коннектится, но ещё не прошёл аутентификацию
    socketManager.on("socket.connected", this.wrapSocket((socket, username) => this.onSocketConnected(socket, username)));
    // Когда сокет дисконнектится из-за того, что не прошёл аутентификацию
    socketManager.on("socket.disconnected", this.wrapSocket((socket, payload) => this.onSocketDisconnected(socket, payload.reason)));
    // Когда сокет подключился и уже имеет аккаунт игрока
    socketManager.on("player.disconnected", this.wrapSocket((socket, player) => this.onPlayerDisconnected(socket, player)));
    // Когда игрок коннектится в лобби
    socketManager.on("lobby.join", this.wrapSocket((socket, player, payload) => this.onLobbyJoin(socket, player, payload)));
    // Когда игрок ливает из лобби
    socketManager.on("lobby.leave", this.wrapSocket((socket, player, payload) => this.onLobbyLeave(socket, player, payload)));
    // Когда команда идёт игрок -> лобби
    socketManager.on("player.command", this.wrapSocket((socket, player, socketPayload) => this.onPlayerCommand(socket, player, socketPayload)));

    // Когда команда идёт лобби -> игрок
    lobbyManager.on("lobby.command", (player: Player, action: string, payload: any) => this.onLobbyCommand(player, action, payload));
    // Когда команда идёт лобби -> игроки
    lobbyManager.on("lobby.broadcast", (lobby: Lobby, action: string, payload: any) => this.onLobbyBroadcast(lobby, action, payload));
  };

  // disable = () => {
  //   this.lobbyManager.removeAllListeners();
  //   this.socketManager.removeAllListeners();
  // };

  constructor(io: socketIO.Server, defaultLobbyType: LobbyConstructor) {
    const socketManager = new AstraSocketManager(io),
      lobbyManager = new AstraLobbyManager(defaultLobbyType),
      playerManager = new AstraPlayerManager();

    this.socketManager = socketManager;
    this.lobbyManager = lobbyManager;
    this.playerManager = playerManager;

    this.listen();
  }
}

// AstraEngine - отвечает за иницизиацию всех подсистем и управление ими
// AstraSocketManager - отвечает за связь сокетов socket.io и игрового движка
// AstraLobbyManager - отваечает за управление лобби
// AstraPlayerManager - отвечает за управление игроками
