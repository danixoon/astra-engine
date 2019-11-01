import * as _ from "lodash";
import { Lobby } from "../../lib/lobby";
import { Player } from "../../lib/player";
import { TimerPlugin, CommandPlugin, StatePlugin } from "../../lib";

export interface ILobbyState {
  count: number;
}
export interface IPlayerState {}

type GameState = "game" | "lobby";

export class TestLobby extends Lobby {
  plugins = {
    timer: new TimerPlugin(),
    command: new CommandPlugin(),
    state: new StatePlugin<ILobbyState, IPlayerState, GameState>(() => ({ state: "lobby", count: 0 }), () => ({ state: "lobby" }))
  };
  maxPlayers = 2;
  onInit() {
    const { state, command, timer } = this.plugins;

    // state.onState("game")(() => {
    //   console.log("osdwo");
    // });

    command
      .on("*", (e, p) => {
        console.log(`${e} EVENTTTTTT!`);
      })
      .on("test.command", (pl, { randomId }) => {
        state.isState("lobby", pl)(() => {
          this.command(pl, "test.command.success", { randomId });
        });
      })

      .on("test.state", (player, { randomId }) => {
        const ls = state.getLobbyState();
        const c = ls.modify(s => ({ count: s.count + 1 })).apply();
        state.setState("game");
        this.command(player, "test.state.success", { count: c.count, randomId });
      })
      .on("game.ping", (p, { randomId }) =>
        state.isState("game")(() => {
          this.command(p, "game.pong", Date.now());
        })
      )
      .on("test.timer", (player, payload) => {
        const randomId = payload.randomId;
        let count = 0;

        timer.setInterval(() => {
          console.log("owo");
          if (++count % 5 === 0) this.command(player, "test.timer.success", { randomId });
        }, 500);
      });
  }
}
