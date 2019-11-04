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
  constructor(private schema: RouterPluginSchema<L, P>, private statePlugin: StatePlugin<L, P>) {}

  setState = (stateType: number, player?: Player) => {
    let stateObject: SyncState<L | P>;
    if (player) stateObject = this.statePlugin.getPlayerState(player);
    else stateObject = this.statePlugin.getLobbyState();

    stateObject.data.state = stateType;
    this.emitter.emit((player ? "player-" : "lobby-") + stateType);
  };

  onState = (action: "player" | "lobby", stateType: number, cb: () => void) => {
    this.emitter.on(action + "-" + stateType, cb);
  };

  offState = (action: "player" | "lobby", stateType: number, cb: () => void) => {
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
        const ls = this.statePlugin.getLobbyState();

        for (let l in this.schema) {
          if (Number(l) & ls.data.state) {
            for (let p in this.schema[l]) {
              const ps = this.statePlugin.getPlayerState(player);
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
