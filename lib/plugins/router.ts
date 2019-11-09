import { ILobbyPlugin } from "..";
import { Player } from "../player";
import { EventEmitter } from "events";
import { LobbyEvent } from "../lobby";
import { StatePlugin, SyncState } from "./state";

export interface RouterPluginSchema<L extends object, P extends object> {
  [lobbyState: number]: {
    [playerState: number]: {
      [command: string]: (player: Player, payload: any, playerState: SyncState<P>, lobbyState: SyncState<L>) => void;
    };
  };
}

type RooterPluginState = { state: number };

export class RouterPlugin<L extends RooterPluginState, P extends RooterPluginState> implements ILobbyPlugin {
  private emitter = new EventEmitter();
  static ANY_STATE = Number.MAX_SAFE_INTEGER;
  constructor(private schema: RouterPluginSchema<L, P>, private getStatePlugin: () => StatePlugin<L, P>) {}

  setState = (stateType: number, player: Player | null, ...payload: any[]) => {
    let stateObject: SyncState<L | P>;
    const statePlugin = this.getStatePlugin();
    if (player) stateObject = statePlugin.getPlayerState(player);
    else stateObject = statePlugin.getLobbyState();

    stateObject.data.state = stateType;
    this.emitter.emit((player ? "player-" : "lobby-") + stateType, ...[player, ...payload]);
  };

  onState = (action: "player" | "lobby", stateType: number, cb: (...payload: any[]) => void) => {
    this.emitter.on(action + "-" + stateType, cb);
  };

  offState = (action: "player" | "lobby", stateType: number, cb: (...payload: any[]) => void) => {
    this.emitter.off(action + "-" + stateType, cb);
  };

  beforeEvent() {}
  afterEvent(e: LobbyEvent, player: Player, action: string, payload?: any) {
    // if (e !== "lobby.command") return;

    switch (e) {
      case "lobby.dispose":
        this.emitter.removeAllListeners();
        break;
      case "lobby.command": {
        const statePlugin = this.getStatePlugin();
        const ls = statePlugin.getLobbyState();

        for (let l in this.schema) {
          if (Number(l) & ls.data.state) {
            for (let p in this.schema[l]) {
              const ps = statePlugin.getPlayerState(player);
              if (Number(p) & ps.data.state) {
                const exec = this.schema[l][p][action];
                if (exec) exec(player, payload, ps, ls);
              }
            }
          }
        }
        break;
      }
    }
  }
}
