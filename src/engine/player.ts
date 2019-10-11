import * as socketIO from "socket.io";

export class PlayerData {
  username: string;
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

    return player;
  }

  remove(id: string) {
    this.players.delete(id);
  }
}
