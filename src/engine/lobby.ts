import { generateId } from "./utils";
import { Player } from "./player";

export abstract class Lobby<T = any> {
  private readonly _id: string;
  get id(): string {
    return this._id;
  }

  readonly players: Player[] = [];
  readonly maxPlayers: number;
  constructor(id: string) {
    this._id = id;
  }

  get isFull(): boolean {
    return this.players.length === this.maxPlayers;
  }

  onJoined(player: Player) {}
}

export class TestLobby extends Lobby {
  maxPlayers = 10;
}

export class AstraLobbyManager {
  private lobbies: Map<string, Lobby> = new Map();
  private lobbiesQueue: string[];

  public get(id: string, required?: boolean) {
    const lobby = this.lobbies.get(id);
    if (required !== undefined) {
      if (required && !lobby) throw `lobby with id <${id}> not exists`;
      if (!required && lobby) throw `lobby with id <${id}> already exists`;
    }

    return lobby;
  }

  public join(player: Player, id: string) {
    let lobby: Lobby = this.get(id, true);

    this.joinPlayer(player, lobby);

    // if (!lobby.isFull) {
    // lobby.players.push(player);
    // } else throw "lobby already full";
  }

  public search(player: Player) {
    let lobbyId = this.lobbiesQueue[0];
    let lobby = this.get(lobbyId, true);

    if (lobby.isFull) throw "this is the bug.. wtf";
    // lobby.players.push(player);
    // if (lobby.isFull) this.lobbiesQueue.shift();

    this.joinPlayer(player, lobby);
  }

  private joinPlayer(player: Player, lobby: Lobby) {
    if (lobby.isFull) throw "lobby already full";

    lobby.players.push(player);
    if (lobby.isFull) {
      let id = this.lobbiesQueue.findIndex(l => l === lobby.id);
      if (id !== -1) this.lobbiesQueue.splice(id, 1);
    }

    lobby.onJoined(player);
  }

  public create<T extends Lobby>(LobbyType: new (id: string) => T) {
    const lobby = new LobbyType(generateId());
    this.lobbies.set(lobby.id, lobby);
    return lobby;
  }
  public dispose(id: string) {
    // this.lobbies.delete(id);
  }
}
