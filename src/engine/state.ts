import { EventEmitter } from "events";
import { Player } from "./player";

export type StatePartial<T = any> = {
  [P in keyof T]?: T[P];
};

export class SyncState<T = any> {
  private emitter: EventEmitter = new EventEmitter();
  private defaultLabel: string = "state.change";
  data: T;

  constructor(defaultState: T, changeLabel: string) {
    this.data = defaultState;
    this.defaultLabel = changeLabel;
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.emitter.off(event, listener);
  }

  disable(event?: string) {
    this.emitter.removeAllListeners(event);
  }

  modify(label: string = this.defaultLabel) {
    const Modify = class {
      private payloadData: any = {};
      private targets: Player[] = [];
      private stateData: StatePartial<T> = {};

      state(stateData: StatePartial<T>) {
        this.stateData = { ...this.stateData, ...stateData };
        return this;
      }

      payload(data: any) {
        this.payloadData = { ...data, ...this.payloadData };
        return this;
      }

      target(...players: Player[]) {
        this.targets = players;
        return this;
      }

      send() {
        send(this.stateData, this.payloadData, this.targets);
      }
    };
    const send = (state: StatePartial<T>, payload: any, target: Player[]) => {
      this.data = { ...this.data, ...state };
      this.emitter.emit("state.change", label, { ...payload, ...state }, target);
    };

    return new Modify();
  }
}
