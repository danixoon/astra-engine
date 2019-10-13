import * as socketIO from "socket.io";
import { EventEmitter } from "events";
import { Player } from "./player";
import { Lobby } from "./lobby";

export interface ISocketCommand {
  action: string;
  payload: any;
}

export interface ISocketErrorPayload {
  error: string;
  data: any;
}

export interface ISocketError extends ISocketCommand {
  action: "error";
  payload: ISocketErrorPayload;
}

export interface ICommandComparer {
  connection: CommandComparer<socketIO.Socket>;
  [key: string]: CommandComparer;
}

export type CommandComparer<T = any> = (...args: T[]) => ISocketError | null;

const createCommand: <T extends ISocketCommand>(action: string, payload?: any) => T = <T extends ISocketCommand = ISocketCommand>(a: string, p: any) => {
  let command: T = { action: a, payload: p } as T;
  return command;
};

// const;

export class AstraSocketManager extends EventEmitter {
  private io: socketIO.Server;
  private comparers: ICommandComparer = {
    connection(socket: socketIO.Socket) {
      const { username } = socket.handshake.query;
      if (!username) throw "username is not provided";

      return username;
    }
  };

  constructor(io: socketIO.Server) {
    super();
    this.io = io;

    io.on("connect", async socket => {
      const { connection } = this.comparers;
      let username;
      try {
        [username] = await this.compare(connection(socket));

        this.onSocketAction("socket.connected", socket, username);

        // socket.on("disconnect", () => this.emit("socket.disconnected") )//this.onAction("socket.disconnected", socket, username));
        // this.onAction("socket.connected", socket, username);
      } catch (err) {
        // При ошибки в соединении - кидаем ошибку
        // this.command(err);
        this.error(socket.id, typeof err === "string" ? err : err.error || "authentication error");
        this.onSocketAction("socket.disconnected", socket, username);
        socket.disconnect();
      }
      // this.onConnection(socket);
    });
  }

  private async compare(command: any, ...comparerResult: any[]) {
    comparerResult.unshift(command);
    const error = comparerResult.find(r => r.action && r.action === "error");
    if (error) throw error;

    return comparerResult;
  }

  // public broadcastCommand(id: string, action: string, payload?: any) {
  //   this.io.to(id).emit("command", createCommand(action, payload));
  // }

  public command(id: string, action: string, payload?: any) {
    this.io.to(id).emit("command", createCommand(action, payload));
  }

  public error(id: string, message: string, data?: any) {
    // const command = createCommand(;
    this.command(id, "error", { error: message, data } as ISocketErrorPayload);
  }

  // Джойнится конкретно к каналу сокета
  public joinToLobby(player: Player, lobbyId: string) {
    player.socket.join(lobbyId);
  }

  // Ливает конкретно с канала сокета
  public leaveFromLobby(player: Player, lobbyId: string) {
    player.socket.leave(lobbyId);
  }

  public onPlayerConnected(player: Player) {
    const { socket } = player;
    socket.on("command", (command: ISocketCommand) => {
      if (!command.action) return this.error(socket.id, "invalid action"); //this.command(createError("invalid action"));
      if (command.action.startsWith("lobby.")) return this.onPlayerAction(command.action, player, command.payload);
      //return this.emit(command.action, username, command.payload); //return this.emit(command.action, username, command.payload);
      else {
        return this.onPlayerAction("player.command", player, command);
      }
    });

    socket.on("disconnect", () => {
      this.onPlayerAction("player.disconnected", player);
    });
  }

  private onSocketAction(action: string, socket: socketIO.Socket, ...args: any[]) {
    this.emit(action, socket, ...args);
  }

  private onPlayerAction(action: string, player: Player, ...args: any[]) {
    this.emit(action, player.socket, player, ...args);
  }

  // private async onConnection(socket: socketIO.Socket) {}
  // // private onDisconnection(socket: socketIO.Socket, username: string) {
  // // this.emit("socket.disconnected", socket);
  // // }

  // public onCommand(id: string, command: ISocketCommand) {
  //   this.emit("command", id, command);
  // }
}
