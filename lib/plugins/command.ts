import { ILobbyPlugin } from "..";
import { Player } from "../player";
import { EventEmitter } from "events";
import { LobbyEvent } from "../lobby";

type CommandPluginEvent<T> = {
  (event: string, cb: (player: Player, payload: any) => void): T;
  (event: "*", cb: (event: string, player: Player, payload: any) => void): T;
};

export class CommandPlugin implements ILobbyPlugin {
  private emitter: EventEmitter = new EventEmitter();

  on: CommandPluginEvent<this> = (event: string, cb: (...args: any[]) => void) => {
    this.emitter.on(event, cb);
    return this;
  };

  off = (event: string, cb: (...args: any[]) => void) => {
    this.emitter.off(event, cb);
    return this;
  };

  beforeEvent() {}
  afterEvent(e: LobbyEvent, player: Player, action: string, payload?: any) {
    switch (e) {
      case "lobby.command": {
        this.emitter.emit("*", action, player, payload);
        this.emitter.emit(action, player, payload);
        break;
      }
      case "lobby.dispose": {
        this.emitter.removeAllListeners();
        break;
      }
    }
  }
}
