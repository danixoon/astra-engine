import { EventEmitter } from "events";
import { Player } from "./player";

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
