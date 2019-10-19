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

// Extending base Lobby class
class GameLobby extends Lobby {
  // The method that casting when a player in the lobby recieve command
  onCommand(player: Player, action: string, payload: any) {
    // When action of command is "ping" - we respond with difference between our time and client time
    if(action === "ping") {
      const ping = Date.now() - payload;
      // And responding to the player with command method
      this.command(player, "pong", ping);
    }
  }
}

// Creating the server (can be on any framework you wish)
const io = SocketIO(3000);
// Creating engine with passing io and GameLobby as arguments
const engine = new AstraEngine(io, GameLobby);
```

Client on JavaScript using socket.io-client:
```js
// EventEmitter not required, but very userful for simplicity
const { EventEmitter } = require("events");
const SocketIO = require("socket.io-client");

// Creating instance of EventEmitter that will recieve only commands from server
const server = new EventEmitter();

// Binding events from server
server
     // When a player connected (after authentication)
    .on("player.connected", ({ playerId }) => {
      // We taking playerId from command payload and displaying it to console
      console.log(`player with id ${playerId} connected!`);
      // After the connection we can join to the lobby with sending a command "join.lobby" in event "command"
      io.emit("command", "lobby.join");
     })
     // When we joined to the Lobby any command started besides "lobby." going directly to lobby's onCommand method
    .on("lobby.joined", ({ playerId, lobbyId }) => {
      // Logging that we are connected
      console.log(`player with id ${playerId} connected to lobby with id ${lobbyId}`);
      // We can emit commands after joining, so we emitting "ping" with payload of current time by Date.now() with interval of 500 ms
      setInterval(() => io.emit("command", "ping", Date.now()), 500);
    })
    // When server responds with command "pong"
    .on("pong", ping => {
      // We just displaying payload ping which came from the server
      console.log("pong!", `ping: ${ping} ms`)
    })

// Creating socket.io connection with query containing username (aka token, them not supported yet)
const io = SocketIO("http://localhost:3000", { query: { username: "1337player" } });
// And, finally, binding "command" event to emit server emitter
io.on("command", (action, payload) => server.emit(action, payload));
```

## Testing

```
yarn test
```

## License

[MIT](LICENSE)
