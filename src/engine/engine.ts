import * as socketIO from "socket.io";
import { EventEmitter } from "events";
import { Player, PlayerData } from "./player";
import { AstraSocketManager, ISocketError, ISocketCommand, ISocketErrorPayload } from "./socket";
import { AstraLobbyManager, Lobby } from "./lobby";

class AstraPlayerManager {
  players: Map<string, Player> = new Map();

  create(socket: socketIO.Socket, data: PlayerData) {
    const id = data.username;
    if (this.players.has(id)) throw "player already exists";
    const player: Player = new Player(id, socket, data);

    return player;
  }

  remove(id: string) {
    this.players.delete(id);
  }
}

export class AstraEngine {
  private socketManager: AstraSocketManager;
  private lobbyManager: AstraLobbyManager;
  private playerManager: AstraPlayerManager;

  private wrapSocket(func: (...args: any[]) => any) {
    return async (socket: socketIO.Socket, player: Player, payload: any = {}, ...socketArgs: any[]) => {
      try {
        await func(socket, player, payload, ...socketArgs);
      } catch (err) {
        if (typeof err === "string") this.socketManager.error(socket.id, err);
        else {
          let e = err as ISocketErrorPayload;
          if (!e || !e.error) this.socketManager.error(socket.id, "internal error");
          else this.socketManager.error(e.error, e.data);
        }

        throw err;
      }
    };
  }

  // private onLobbyDisposed(players: Player[]) {}

  constructor(io: socketIO.Server) {
    const socketManager = new AstraSocketManager(io),
      lobbyManager = new AstraLobbyManager(),
      playerManager = new AstraPlayerManager();

    this.socketManager = socketManager;
    this.lobbyManager = lobbyManager;
    this.playerManager = playerManager;

    // socketManager.on("owo", this.handleSocket((socket, any) => {}));
    socketManager.on(
      "socket.connected",
      this.wrapSocket((socket, username) => {
        const player = playerManager.create(socket, { username });

        socketManager.onPlayerConnected(player);
        socketManager.command("player.connected", player.socket.id);

        // socketManager.emit("player.connected");
        // socketManager.command(createCommand("player.connected"));

        // socketManager.p
      })
    );
    socketManager.on(
      "socket.disconnected",
      this.wrapSocket((socket, username) => {
        playerManager.remove(username);
      })
    );
    socketManager.on(
      "lobby.join",
      this.wrapSocket((socket, player, payload) => {
        const { id } = payload;
        let lobby = lobbyManager.join(player, id);
        socketManager.joinToLobby(player, lobby.id);
        socketManager.command(lobby.id, "lobby.joined", { lobbyId: lobby.id });
      })
    );
    socketManager.on(
      "lobby.leave",
      this.wrapSocket((socket, player, payload) => {
        const { id } = payload;
        const { disposed, lobby } = lobbyManager.leave(player, id);

        socketManager.command(lobby.id, "lobby.leaved", { playerId: player.id });
        socketManager.leaveFromLobby(player, lobby.id);
        // if (disposed) socketManager.command(lobby.id, "lobby.disposed");
        // ЯОСТАНОВИЛСЯ ТУТ СУКИ ПОННЯЛИ?
        // socketManager.broadcastCommand(lobby, "lobby.leaved", lobby);
      })
    );

    socketManager.on(
      "player.command",
      this.wrapSocket((socket, player, socketPayload) => {
        const { action, payload } = socketPayload;
        if (!action) throw "invalid action";

        lobbyManager.command(player, action, payload || {});
      })
    );

    lobbyManager.on("lobby.command", (player: Player, action: string, payload: any) => {
      socketManager.command(player.socket.id, action, payload);
    });
  }
}

// AstraEngine - отвечает за иницизиацию всех подсистем и управление ими
// AstraSocketManager - отвечает за связь сокетов socket.io и игрового движка
// AstraLobbyManager - отваечает за управление лобби
// AstraPlayerManager - отвечает за управление игроками
