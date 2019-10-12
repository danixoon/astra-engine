import * as socketIO from "socket.io-client";
import * as socketIOServer from "socket.io";
import { AstraEngine } from "../src/engine/engine";
import { start } from "../src/web/server";

const createClient = (cb: (io: SocketIOClient.Socket, username: string) => void, ...usernames: string[]) => {
  return usernames.map(u => {
    const io = socketIO("http://localhost:5000", { query: { username: u } });
    cb(io, u);
    return io;
  });
};

const awaitCommand = (socket: SocketIOClient.Socket, action: string) => {
  return new Promise((res, rej) => {
    const bind = c => {
      if (c.action !== action) return;
      socket.removeListener("command", bind);
      res(c);
    };
    socket.on("command", bind);
  });
};

const subscribeClients = (...usernames: string[]) => {
  const clients = createClient((io, u) => {
    io.on("command", data => {
      if (data.action === "error") console.log(`action <${data.action}> to <${u}>\nmessage: ${data.payload.error}`);
      else console.log(`action <${data.action}> to <${u}> | payload:\n`, data.payload);
    });
    io.on("connect", () => console.log(`<${u}> connection!`));
  }, ...usernames);
  return clients;
};

jest.setTimeout(1000);

start();

describe("init test", () => {
  let clients: SocketIOClient.Socket[] = [];
  let io;
  beforeAll(() => {
    clients = subscribeClients("owo");
  });

  it("join lobby", async done => {
    [io] = clients;

    awaitCommand(io, "lobby.joined").then(c => {
      done();
    });

    io.emit("command", { action: "lobby.join" });
  });

  it("ping command", async done => {
    awaitCommand(io, "game.pong").then(c => {
      done();
    });

    io.emit("command", { action: "game.ping" });
  });

  it("leave lobby", async done => {
    awaitCommand(io, "lobby.leaved").then(c => {
      done();
    });

    io.emit("command", { action: "lobby.leave" });
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
