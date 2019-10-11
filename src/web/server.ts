import * as express from "express";
import * as path from "path";
import * as socketIO from "socket.io";
import { AstraEngine } from "../engine/engine";

export function start() {
  const app = express();
  //production mode
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client/build")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/build/index.html"));
    });
  }

  const port = process.env.PORT || 5000;

  const server = app.listen(port, async () => {
    console.log(`Server listening at ${port} port`);
  });
  const io = socketIO.listen(server);
  const engine = new AstraEngine(io);

  // initSocket(io, players);
}
