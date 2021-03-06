import * as socketIO from "socket.io-client";
import * as socketIOServer from "socket.io";
import { AstraEngine } from "../../lib";
import * as express from "express";
import { TestLobby } from "./game";

export function start() {
  const app = express();
  const port = process.env.PORT || 5001;
  const server = app.listen(port, () => `server listening at ${port} port`);
  const io = socketIOServer.listen(server);
  const engine = new AstraEngine(io, TestLobby);

  // engine.listen();
}

const command = (io: SocketIOClient.Socket, command: string, awaitCommand?: string, payload?: any) => {
  return new Promise((res, rej) => {
    const rndId = Math.random();
    const bindCmd = (cmd: string, pld: any = {}) => {
      if (cmd !== awaitCommand || (!command.startsWith("lobby.") && pld.randomId !== rndId)) return;
      unbind();
      res(pld);
    };
    const bindErr = (cmd: string, pld: any) => {
      if (pld.action !== awaitCommand || pld.randomId !== rndId) return;
      unbind();
      rej(pld);
    };
    const unbind = () => {
      io.off("command", bindCmd);
      io.off("error", bindErr);
    };
    io.on("command", bindCmd);
    io.on("error", bindErr);
    io.emit("command", command, { ...payload, randomId: rndId });
  });
};

const test = async () => {
  start();
  const io = socketIO("ws://localhost:5001", { query: { username: "poopa" }, transports: ["websocket"], upgrade: false });
  await command(io, "lobby.join", "lobby.joined");
  await command(io, "test.command", "test.command.success");

  await command(io, "state.set", "state.set");
  await command(io, "player.attack", "player.attack");

  // const changeState = () => command(io, "test.state", "test.state.success");

  // for (let i = 0; i < 3; i++) console.log(`sync count: ${((await changeState()) as any).count}`);

  // // await command(io, "test.ping")

  // await command(io, "test.timer", "test.timer.success");
  await command(io, "lobby.leave", "lobby.leaved");
  console.log("all tests passed!");

  process.exit();
};

test();
