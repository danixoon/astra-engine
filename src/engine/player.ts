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
