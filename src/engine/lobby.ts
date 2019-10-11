import { generateId, mapValueChecker } from "./utils";
import { Player } from "./player";

export abstract class Lobby<T = any> {
  private readonly _id: string;
  get id(): string {
    return this._id;
  }

  players: Player[] = [];
  readonly maxPlayers: number;
  constructor(id: string) {
    this._id = id;
  }

  get isFull(): boolean {
    return this.players.length === this.maxPlayers;
  }
  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  onJoined(player: Player) {}
  onLeaved(player: Player) {}
  onDispose() {}
}

export class TestLobby extends Lobby {
  maxPlayers = 10;
}

export class AstraLobbyManager {
  private lobbies: Map<string, Lobby> = new Map();
  private lobbiesQueue: string[];
  // id игрока -> id лобби
  private connections: Map<string, string> = new Map();

  // public getLobby(id: string, required?: boolean) {
  //   const lobby = this.lobbies.get(id);
  //   if (required !== undefined) {
  //     if (required && !lobby) throw `lobby with id <${id}> not exists`;
  //     if (!required && lobby) throw `lobby with id <${id}> already exists`;
  //   }

  //   return lobby;
  // }

  public getLobby = mapValueChecker<Lobby>(this.lobbies, id => ({
    exclude: `lobby with id <${id}> not exists`,
    include: `lobby with id <${id}> already exists`
  }));
  public getConnection = mapValueChecker<string>(this.connections, id => ({
    exclude: `player with id <${id}> not connected to lobby`,
    include: `player with id <${id}> already connected to lobby`
  }));

  public join(player: Player, id?: string) {
    let lobby: Lobby;
    if (id !== undefined) {
      lobby = this.getLobby(id, true);
    } else {
      let lobbyId = this.lobbiesQueue[0];
      let lobby = this.getLobby(lobbyId, true);

      if (lobby.isFull) throw "this is the bug.. wtf";
    }
    return this.joinPlayer(player, lobby);
  }

  private joinPlayer(player: Player, lobby: Lobby) {
    if (lobby.isFull) throw "lobby already full";

    lobby.players.push(player);
    // Если после подключение лобби заполнено - удалить его из списка ожидаемых к подключению
    if (lobby.isFull) {
      let id = this.lobbiesQueue.findIndex(l => l === lobby.id);
      if (id !== -1) this.lobbiesQueue.splice(id, 1);
    }

    lobby.onJoined(player);

    return lobby;
  }

  public leave(player: Player, id?: string) {
    let lobby: Lobby;
    if (id !== undefined) {
      lobby = this.getLobby(id, true, l => !l.players.includes(player) && `player not connected to lobby with id <${l.id}>`);
    } else {
      let lobbyId = this.getConnection(player.id, true);
      lobby = this.getLobby(lobbyId);
    }
    return { lobby, disposed: this.leavePlayer(player, lobby) };
  }

  // Внутренний метод, кидающий игрока с лобби, возвращает true, если лобби уничтожено, иначе false
  private leavePlayer(player: Player, lobby: Lobby) {
    this.connections.delete(player.id);
    lobby.players = lobby.players.filter(p => p.id !== player.id);

    lobby.onLeaved(player);

    if (!lobby.isEmpty) return false;

    this.dispose(lobby.id);
    return true;
  }

  // Метод, создающий лобби
  public create<T extends Lobby>(LobbyType: new (id: string) => T) {
    const lobby = new LobbyType(generateId());
    this.lobbies.set(lobby.id, lobby);
    this.lobbiesQueue.push(lobby.id);
    return lobby;
  }
  // Внешняя компанда, вызывающее уничтожение лобби
  public dispose(id: string) {
    const lobby = this.getLobby(id, true);
    return this.disposeLobby(lobby);
  }
  // Возвращает игроков, покинувших лобби при уничтожении
  private disposeLobby(lobby: Lobby) {
    lobby.onDispose();

    // Убираем лобби из списка очереди на подключение
    let lobbyId = this.lobbiesQueue.findIndex(i => i === lobby.id);
    if (lobbyId !== -1) this.lobbiesQueue.splice(lobbyId, 1);

    // Убираем все подключения к лобби
    lobby.players.forEach(p => {
      this.connections.delete(p.id);
    });

    return lobby.players;
    // ЗДЕСЬ НАДО ПОСЛАТЬ ВСЕМ ИГРОКАМ ШО ОНИ ОТРУБИЛИСЬ ОГО ПО СОКЕТАМ ТИПА ОКЕЙ ДА .. . . ООО ПРИДУМАЛ НЕТ НЕ ПРИДУМАЛ
  }
}
