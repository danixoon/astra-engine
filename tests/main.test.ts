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

jest.setTimeout(30000);

start();

describe("init test", () => {
  let clients;
  beforeEach(done => {
    clients = createClient((io, u) => {
      io.on("command", data => {
        if (data.action === "error") console.log(`action <${data.action}> to <${u}>\nmessage: ${data.payload.message}`);
        else console.log(`action <${data.action}> to <${u}>`);
      });
      io.on("connect", () => console.log(`<${u}> connection!`));
    }, "owo");
    done();
  });

  it("stop server", done => {
    setTimeout(() => done(), 4000);
  });
});
