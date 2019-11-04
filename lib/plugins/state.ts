import { ILobbyPlugin } from "..";
import { Player } from "../player";
import { EventEmitter } from "events";
import { LobbyEvent } from "../lobby";

export type StatePartial<T = any> = {
  [P in keyof T]?: T[P];
};

export type MappedPartial<T = any> = {
  [P in keyof T]?: T[P] | any;
};

type ModifyCallback<T> = (s: T, c: StatePartial<T>) => StatePartial<T>;
type MapperCallback<T> = (s: T, c: StatePartial<T>) => MappedPartial<T>;

export class SyncState<T = any> {
  data: T;

  constructor(defaultState: T) {
    this.data = defaultState;
  }

  modify(cb: ModifyCallback<T>) {
    // Объект нового состояния
    let state = { ...this.data } as T;
    // Все внутрениие изменения состояния
    let changes = {} as StatePartial<T>;
    let mapped: StatePartial<T> | null = null;

    const applyState = (data: StatePartial<T>) => {
      this.data = { ...this.data, ...data };
    };

    const Modify = class {
      modify(cb: ModifyCallback<T>) {
        // То, что изменилось
        const c = cb(state, changes);
        changes = { ...changes, ...c };
        return this;
      }
      map(cb: MapperCallback<T>) {
        const c = cb(state, changes);
        mapped = { ...mapped, ...c };
        return this;
      }
      apply() {
        applyState(changes);
        return mapped === null ? changes : mapped;
      }
    };

    const s = new Modify().modify(cb);
    return s;
  }
}

export class StatePlugin<L, P> implements ILobbyPlugin {
  private emitter: EventEmitter = new EventEmitter();
  // private stateEmitter: EventEmitter = new EventEmitter();
  private lobbyState: SyncState<L> = new SyncState<any>({});
  private playerState: Map<string, SyncState<P>> = new Map();

  constructor(private createLobbyState: () => L = () => ({} as L), private createPlayerState: () => P = () => ({} as P)) {}

  getLobbyState = () => {
    return this.lobbyState;
  };

  getPlayerState = (player: Player) => {
    return this.playerState.get(player.id) as SyncState<P>;
  };

  beforeEvent() {}
  afterEvent(e: LobbyEvent, player: Player) {
    switch (e) {
      case "lobby.dispose": {
        this.emitter.removeAllListeners();
        break;
      }
      case "lobby.joined": {
        let state = this.playerState.get(player.id);

        if (!state) {
          const pState = this.createPlayerState();
          state = new SyncState(pState);
          this.playerState.set(player.id, state);
        }
        break;
      }
      case "lobby.init": {
        // Создаём состояние лобби
        const lState = this.createLobbyState();
        // Присваиваем состояние
        this.lobbyState = new SyncState(lState);
        break;
      }
      case "lobby.leaved": {
        // Здеся можно убрать данные об состоянии ливнувшего игрока, но не обязательно
        // const state = this._playerState.get(player.id);
        // if (!state) throw "WTF THIS IS THE BUG.";
        break;
      }
    }
  }
}
