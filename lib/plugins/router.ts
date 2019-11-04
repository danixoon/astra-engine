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
  static ANY_STATE = Number.MAX_SAFE_INTEGER;
  constructor(private schema: RouterPluginSchema<L, P>, private statePlugin: StatePlugin<L, P>) {}
  beforeEvent() {}
  afterEvent(e: LobbyEvent, player: Player, action: string, payload?: any) {
    if (e !== "lobby.command") return;

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
  }
}
