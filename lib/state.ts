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

    // Игроки, которым рассылается данное изменение состояния
    let targets: Player[] = [];
    // То, что изменилось в состоянии и подлежит отправке игрокам
    let publicState: StatePartial<T> = {};
    // То, что изменилось в состоянии и не подлежит отправке игрокам
    let privateState: StatePartial<T> = {};

    let payloadCallback: (state: T) => any = () => ({});

    const Modify = class {
      // Дополнительные данные, передающиеся после изменения стейта

      // Метод, изменяющий состояние, которое в последствии посылается
      public(stateData?: StatePartial<T>) {
        if (stateData) publicState = { ...publicState, ...stateData };
        else publicState = { ...publicState, ...privateState };
        return this;
      }

      // Метод, превращающий изменённое состояние, отправляемое игрокам,
      // // на основе возвращаемого значения callback-функции в аргументе
      // map(cb: (v: StatePartial<T>, state: T) => any) {
      //   publicState = { ...publicState, ...cb(publicState, stateObject.data) };
      //   return this;
      // }

      // Метод, изменяющий состояние, которое не подлежит отправке
      private(cb: (v: StatePartial<T>, state: T) => any) {
        privateState = { ...privateState, ...cb(publicState, stateObject.data) }; // { ...this.silentStateData, ...stateData };
        return this;
      }

      // Метод, прикрепляющий доп. данные к отправке игроку, не влияющие на состояние
      payload(cb: (state: T) => StatePartial<T>) {
        // payloadData = { ...data, ...payloadData };
        payloadCallback = cb;
        return this;
      }

      // Метод, уточняющий, каким игрокам отправить данные (действует только для лобби)
      target(...players: Player[]) {
        targets = players;
        return this;
      }

      // Метод, отправляющий данные и обновляюший состояние
      apply() {
        apply(publicState, privateState, targets);
      }
    };
    const apply = (publicState: StatePartial<T>, privateState: StatePartial<T>, target: Player[]) => {
      this.data = { ...this.data, ...publicState, ...privateState };
      this.emitter.emit("state.change", label, { ...payloadCallback(this.data), ...publicState }, target);
    };

    return new Modify();
  }
}
