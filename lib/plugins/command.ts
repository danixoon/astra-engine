import { ILobbyPlugin } from "..";
import { Player } from "../player";
import { EventEmitter } from "events";

export class CommandPlugin implements ILobbyPlugin {
  private emitter: EventEmitter = new EventEmitter();

  on = (event: string, cb: (player: Player, payload: any) => void) => {
    this.emitter.on(event, cb);
    return this;
  };

  off = (event: string, cb: (player: Player, payload: any) => void) => {
    this.emitter.off(event, cb);
    return this;
  };

  beforeEvent() {}
  afterEvent(e: string, player: Player, action: string, payload?: any) {
    if (e !== "lobby.command") return;
    this.emitter.emit(action, player, payload);
  }
}
