import * as _ from "lodash";
import { Lobby } from "../../lib/lobby";
import { Player } from "../../lib/player";
import { TimerPlugin, CommandPlugin, StatePlugin, RouterPlugin, RouterPluginSchema } from "../../lib";

enum LobbyState {
  "game" = 1 << 1,
  "lobby" = 1 << 2,
  "test" = 1 << 3
}

enum PlayerState {
  "alive" = 1 << 1,
  "dead" = 1 << 2
}

// const StateSet = new Set([{ hi: "owo" }, { yolo: "os" }]);

export interface ILobbyState {
  count: number;
  state: number;
}
export interface IPlayerState {
  state: number;
}

const createPlayerState = (): IPlayerState => ({ state: PlayerState.dead });
const createLobbyState = (): ILobbyState => ({ state: LobbyState.test, count: 0 });

export class TestLobby extends Lobby {
  schema: RouterPluginSchema<ILobbyState, IPlayerState> = {
    [LobbyState.game]: {
      [PlayerState.alive]: {
        "player.attack": (player, payload, ps, ls) => {
          this.command(player, "player.attack", { randomId: payload.randomId, state: PlayerState[ps.data.state] });
        },
        "player.move": () => {}
      },
      [PlayerState.alive | PlayerState.dead]: {
        "player.message": () => {}
      },
      [RouterPlugin.ANY_STATE]: {
        "player.pause": () => {}
      }
    },
    [LobbyState.test]: {
      [RouterPlugin.ANY_STATE]: {
        "test.command": (player, { randomId }) => {
          this.command(player, "test.command.success", { randomId });
        },
        "state.set": (player, { randomId }) => {
          const { router } = this.plugins;
          router.setState(PlayerState.alive, player);
          // this.plugins.state.getLobbyState().data.state = LobbyState.game;
          // this.plugins.state.getPlayerState(player).data.state = PlayerState.alive;
          this.command(player, "state.set", { randomId });
        }
      }
    }
  };

  onInit() {
    const { router } = this.plugins;
    router.onState("player", PlayerState.dead, () => {
      console.log("player live!");
    });
  }

  plugins: any = {
    router: new RouterPlugin(this.schema, () => this.plugins.state),
    timer: new TimerPlugin(),
    command: new CommandPlugin(),
    state: new StatePlugin<ILobbyState, IPlayerState>(createLobbyState, createPlayerState)
  };
  maxPlayers = 2;
}
