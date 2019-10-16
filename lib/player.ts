import * as socketIO from "socket.io";
import { loggers } from "./utils";

export class PlayerData {
  constructor(public username: string) {}
}

export class Player {
  data: PlayerData;

  socket: socketIO.Socket;
  readonly id: string;
  constructor(id: string, socket: socketIO.Socket, data: PlayerData) {
    this.id = id;
    this.data = data;
    this.socket = socket;
  }
}

export class AstraPlayerManager {
  players: Map<string, Player> = new Map();

  create(socket: socketIO.Socket, data: PlayerData) {
    const id = data.username;
    if (this.players.has(id)) throw "player already exists";
    const player: Player = new Player(id, socket, data);

    this.players.set(id, player);

    loggers.player("player  created", data.username);
    return player;
  }

  remove(id: string) {
    this.players.delete(id);
    loggers.player("player  removed", id);
  }
}
