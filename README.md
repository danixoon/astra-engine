# astra-engine

## Что это?

astra-engine - игровой веб-движок, написанный на NodeJS и использующий модуль socket.io

## Установка

```bash
npm install astra-engine
```

## Как использовать

Запуск сервера на TypeScript:
```ts
import SocketIO from "socket.io";
import { AstraEngine, Lobby, Player } from "astra-engine";

// Наследуемся от базового класса лобби
class GameLobby extends Lobby {
  // Метод вызывается когда команда прилетает от игрока в данном лобби
  onCommand(player: Player, action: string, payload: any) {
    // Если экшен команды "ping"
    if(action === "ping") {
      // Определяем задержку между игроком и сервером, которая является разницей во времени между ними
      const ping = Date.now() - payload;
      // И посылаем игроку задержку (пинг)
      this.command(player, "pong", ping);
    }
  }
}

// Создаём сервер (может быть любым фреймворком, поддерживающим socket.io)
const io = SocketIO(3000);
// И экземпляр движка, передавая созданный socket.io сервер и класс лобби, используемый по умолчанию
const engine = new AstraEngine(io, GameLobby);
```

Подключение клиента на JavaScript:
```js
// EventEmitter не обязателен, но очень полезен для упрощения обработки команд
const { EventEmitter } = require("events");
const SocketIO = require("socket.io-client");

// Создаём экземпляр EventEmitter'а
const server = new EventEmitter();

// Привязываем к нему все обрабатываемые команды
server
     // Когда игрок подключился (после аунтентификации)
    .on("player.connected", ({ playerId }) => {
      // Берём playerId из данных, пришедших от сервера (пейлода)
      console.log(`player with id ${playerId} connected!`);
      // И отправляем команду подсоединения к лобби, т.к. после подключения мы можем это сделать
      io.emit("command", "lobby.join");
     })
     // Когда мы подключились к лобби - мы можем отправлять команды непосредственно в него
    .on("lobby.joined", ({ playerId, lobbyId }) => {
      // Выводим, что мы подключились в лобби
      console.log(`player with id ${playerId} connected to lobby with id ${lobbyId}`);
      // И, с интервалом в 500 мс, посылаем текущие время серверу
      setInterval(() => io.emit("command", "ping", Date.now()), 500);
    })
    // Когда же сервер отвечает нам командой "pong"
    .on("pong", ping => {
      // Мы выводим пинг, полученный из аргумента, являющимся пришедшими данными от движка
      console.log("pong!", `ping: ${ping} ms`)
    })

// Создаём соединение, передавая в query строку username, являющейся ключём аутентификации в данный момент
// (поддержка токенов пока не реализована)
const io = SocketIO("http://localhost:3000", { query: { username: "1337player" } });
// И враппим данные о команде в наш эмиттер
io.on("command", (action, payload) => server.emit(action, payload));
```

## Тесты

```
yarn test
```

## Лицензия

[MIT](LICENSE)
