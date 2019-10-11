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
    return async (...socketArgs: any[]) => {
      try {
        await func(...socketArgs);
      } catch (err) {
        if (typeof err === "string") this.socketManager.error(err);
        else {
          let e = err as ISocketErrorPayload;
          if (!e || !e.error) this.socketManager.error("internal error");
          else this.socketManager.error(e.error, e.data);
        }

        throw err;
      }
    };
  }

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
      this.wrapSocket((player, payload) => {
        const { id } = payload;
        let lobby: Lobby;
        if (id) {
          lobbyManager.join(player, id);
          lobby = lobbyManager.get(id, true);
        } else {
          lobbyManager.search(player);
          // lobbyManager.
          // lobbyManager.
        }
      })
    );
  }
}

// AstraEngine - отвечает за иницизиацию всех подсистем
// AstraSocketManager - отвечает за связь сокетов socket.io и игрового движка
// AstraLobbyManager - отваечает за управление лобби
// AstraPlayerManager - отвечает за управление игроками
