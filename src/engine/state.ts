import { EventEmitter } from "events";
import { Player } from "./player";

export type StatePartial<T = any> = {
  [P in keyof T]?: T[P];
};

export class SyncState<T = any> {
  private emitter: EventEmitter = new EventEmitter();
  data: T;

  on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.emitter.off(event, listener);
  }

  disable(event?: string) {
    this.emitter.removeAllListeners(event);
  }

  constructor(defaultState: T) {
    this.data = defaultState;
  }

  send(label: string, changes: StatePartial<T>, ...target: Player[]) {
    this.data = { ...this.data, ...changes };

    this.emitter.emit("state.change", label, changes, target);
  }
}
