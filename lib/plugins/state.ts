import { ILobbyPlugin } from "..";
import { Player } from "../player";
import { EventEmitter } from "events";
import { LobbyEvent } from "../lobby";
import { stat } from "fs";

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

type StateType<T> = { state: T };

export class StatePlugin<T, K, S extends string = any> implements ILobbyPlugin {
  private emitter: EventEmitter = new EventEmitter();
  private lobbyState: SyncState<T & StateType<S>> = new SyncState<any>({});
  private playerState: Map<string, SyncState<K & StateType<S>>> = new Map();

  private createLobbyState: () => T & StateType<S> = () => ({ state: "" } as T & StateType<S>);
  private createPlayerState: () => K & StateType<S> = () => ({ state: "" } as K & StateType<S>);

  constructor(createLobbyState: () => T & StateType<S>, createPlayerState: () => K & StateType<S>) {
    this.createLobbyState = createLobbyState;
    this.createPlayerState = createPlayerState;
  }

  public isState = (state: S | S[], player?: Player) => (cb?: () => void): boolean => {
    const stateObject = player ? this.getPlayerState(player) : this.getLobbyState();
    const stateType = stateObject.data.state;

    const result = (Array.isArray(state) && state.includes(stateType)) || stateType === state;
    if (result && typeof cb === "function") cb();
    return result;
  };

  public setState = (state: S, player?: Player) => {
    const stateObject = player ? this.getPlayerState(player) : this.getLobbyState();
    stateObject.data.state = state;
    this.emitter.emit((player ? "p-" : "l-") + state);
  };

  public onState = (state: S, player?: Player) => (cb: () => void) => {
    if (player) this.emitter.on("p-" + state, cb);
    else this.emitter.on("l-" + state, cb);
  };
  public offState = (state: S, player?: Player) => (cb: () => void) => {
    if (player) this.emitter.off("p-" + state, cb);
    else this.emitter.off("l-" + state, cb);
  };

  getLobbyState = () => {
    return this.lobbyState;
  };

  getPlayerState = (player: Player) => {
    return this.playerState.get(player.id) as SyncState<K & StateType<S>>;
  };

  beforeEvent() {}
  afterEvent(e: LobbyEvent, player: Player) {
    switch (e) {
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
