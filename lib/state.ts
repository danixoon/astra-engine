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
    const stateObject = this;

    let payloadData: any = {};
    // Игроки, которым рассылается данное изменение состояния
    let targets: Player[] = [];
    // То, что изменилось в состоянии и подлежит отправке игрокам
    let publicState: StatePartial<T> = {};
    // То, что изменилось в состоянии и не подлежит отправке игрокам
    let privateState: StatePartial<T> = {};

    const Modify = class {
      // Дополнительные данные, передающиеся после изменения стейта

      // Метод, изменяющий состояние, которое в последствии посылается
      public(stateData: StatePartial<T>) {
        publicState = { ...publicState, ...stateData };
        return this;
      }

      // Метод, превращающий изменённое состояние, отправляемое игрокам,
      // на основе возвращаемого значения callback-функции в аргументе
      map(cb: (v: StatePartial<T>, state: T) => any) {
        publicState = { ...publicState, ...cb(publicState, stateObject.data) };
        return this;
      }

      // Метод, изменяющий состояние, которое не подлежит отправке
      private(cb: (v: StatePartial<T>, state: T) => any) {
        privateState = { ...privateState, ...cb(publicState, stateObject.data) }; // { ...this.silentStateData, ...stateData };
        return this;
      }

      // Метод, прикрепляющий доп. данные к отправке игроку, не влияющие на состояние
      payload(data: any) {
        payloadData = { ...data, ...payloadData };
        return this;
      }

      // Метод, уточняющий, каким игрокам отправить данные (действует только для лобби)
      target(...players: Player[]) {
        targets = players;
        return this;
      }

      // Метод, отправляющий данные и обновляюший состояние
      apply() {
        apply(publicState, privateState, payloadData, targets);
      }
    };
    const apply = (publicState: StatePartial<T>, privateState: StatePartial<T>, payload: any, target: Player[]) => {
      this.data = { ...this.data, ...publicState, ...privateState };
      this.emitter.emit("state.change", label, { ...payload, ...publicState }, target);
    };

    return new Modify();
  }
}
