import * as socketIO from "socket.io-client";
import * as socketIOServer from "socket.io";
import { AstraEngine } from "../lib/engine";
import * as express from "express";
import * as path from "path";
import { TestLobby } from "./game/game";

export function start() {
  const app = express();
  const port = process.env.PORT || 5001;
  const server = app.listen(port, () => `server listening at ${port} port`);
  const io = socketIOServer.listen(server);
  const engine = new AstraEngine(io, TestLobby);
}

const createClient = (cb: (io: SocketIOClient.Socket, username: string) => void, ...usernames: string[]) => {
  return usernames.map(u => {
    const io = socketIO("ws://localhost:5001", { query: { username: u }, transports: ["websocket"], upgrade: false });
    cb(io, u);
    return io;
  });
};

const awaitCommand = (socket: SocketIOClient.Socket, action: string) => {
  return new Promise((res, rej) => {
    const bind = (a: string, p: any) => {
      if (a !== action) return;
      socket.removeListener("command", bind);
      res(p);
    };
    socket.on("command", bind);
  });
};

const subscribeClients = (...usernames: string[]) => {
  const clients = createClient((io, u) => {
    io.on("command", (action: string, data: any) => {
      if (action === "error") {
        console.log(`action <${data.action}> to <${u}>\nmessage: `, data.payload);
      }
      // else console.log(`action <${data.action}> to <${u}> | payload:\n`, data.payload);
    });
    io.on("connect", () => console.log(`<${u}> connection!`));
  }, ...usernames);
  return clients;
};

jest.setTimeout(3000);

start();

describe("init test", () => {
  let clients: SocketIOClient.Socket[] = [];
  let io: SocketIOClient.Socket;
  beforeAll(() => {
    clients = subscribeClients("owo");
  });

  it("join lobby", async done => {
    [io] = clients;

    awaitCommand(io, "lobby.joined").then(c => {
      done();
    });

    io.emit("command", "lobby.join");
  });

  it("ping command", async done => {
    awaitCommand(io, "game.pong").then((c: any) => {
      console.log("ping score: " + c.score);
      done();
    });

    io.emit("command", "game.ping");
  });

  it("leave lobby", async done => {
    awaitCommand(io, "lobby.leaved").then(c => {
      done();
    });

    io.emit("command", "lobby.leave");
  });

  // it("multiplayer lobbies", async done => {
  //   clients = subscribeClients("vova", "petya", "keke");
  //   Promise.all(clients.map(c => awaitCommand(c, "lobby.joined"))).then(lobbies => {
  //     console.log(lobbies);
  //     done();
  //   });
  //   clients.map(c => c.emit("command", { action: "lobby.join" }));
  // });

  it("disconnect all", () => {
    clients.forEach(c => c.disconnect());
  });

  afterAll(done => {
    setTimeout(() => done(), 4000);
  });
});
