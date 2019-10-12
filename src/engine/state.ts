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
    const Modify = class {
      // Дополнительные данные, передающиеся после изменения стейта
      private payloadData: any = {};
      // Игроки, которым рассылается данное изменение состояния
      private targets: Player[] = [];
      // То, что изменилось в состоянии и подлежит отправке игрокам
      private publicState: StatePartial<T> = {};
      // То, что изменилось в состоянии и не подлежит отправке игрокам
      private privateState: StatePartial<T> = {};

      // Метод, изменяющий состояние, которое в последствии посылается
      public(stateData: StatePartial<T>) {
        this.publicState = { ...this.publicState, ...stateData };
        return this;
      }

      // Метод, превращающий изменённое состояние, отправляемое игрокам,
      // на основе возвращаемого значения callback-функции в аргументе
      map(cb: (v: StatePartial<T>, state: T) => any) {
        this.publicState = { ...this.publicState, ...cb(this.publicState, stateObject.data) };
        return this;
      }

      // Метод, изменяющий состояние, которое не подлежит отправке
      private(cb: (v: StatePartial<T>, state: T) => any) {
        this.privateState = { ...this.privateState, ...cb(this.publicState, stateObject.data) }; // { ...this.silentStateData, ...stateData };
        return this;
      }

      // Метод, прикрепляющий доп. данные к отправке игроку, не влияющие на состояние
      payload(data: any) {
        this.payloadData = { ...data, ...this.payloadData };
        return this;
      }

      // Метод, уточняющий, каким игрокам отправить данные (действует только для лобби)
      target(...players: Player[]) {
        this.targets = players;
        return this;
      }

      // Метод, отправляющий данные и обновляюший состояние
      apply() {
        apply(this.publicState, this.privateState, this.payloadData, this.targets);
      }
    };
    const apply = (publicState: StatePartial<T>, privateState: StatePartial<T>, payload: any, target: Player[]) => {
      this.data = { ...this.data, ...publicState, ...privateState };
      this.emitter.emit("state.change", label, { ...payload, ...publicState }, target);
    };

    return new Modify();
  }
}
