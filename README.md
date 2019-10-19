# astra-engine

## Features

astra-engine - web game engine written on node.js with socket.io

## Installation

```bash
npm install astra-engine
```

## How to use

Server on TypeScript using socket.io:
```ts
import SocketIO from "socket.io";
import { AstraEngine, Lobby, Player } from "astra-engine";

class GameLobby extends Lobby {
  onCommand(player: Player, action: string, payload: any) {
    if(action === "ping") {
      const ping = Date.now() - payload;
      this.command(player, "pong", ping);
    }
  }
}

const io = SocketIO(3000);
const engine = new AstraEngine(io, GameLobby);
```

Client on JavaScript using socket.io-client:
```js
const { EventEmitter } = require("events");
const SocketIO = require("socket.io-client");

const server = new EventEmitter();

server
    .on("player.connected", ({ playerId }) => {
      console.log(`player with id ${playerId} connected!`);
      io.emit("command", "lobby.join");
     })
    .on("lobby.joined", ({ playerId, lobbyId }) => {
      console.log(`player with id ${playerId} connected to lobby with id ${lobbyId}`);
      setInterval(() => io.emit("command", "ping", Date.now()), 500);
    })
    .on("pong", ping => {
      console.log("pong!", `ping: ${ping}ms`)
    })

const io = SocketIO("http://localhost:3000", { query: { username: "1337player" } });
io.on("command", (action, payload) => server.emit(action, payload));
```

## Testing

```
yarn test
```

## License

[MIT](LICENSE)
