import * as _ from "lodash";
import { Lobby } from "../../lib/lobby";
import { Player } from "../../lib/player";
import { StatePartial } from "../../lib/state";
import { TimerPlugin, CommandPlugin } from "../../lib";

export interface ITestLobbyState {}
export interface ITestPlayerState {}

export class TestLobby extends Lobby<ITestLobbyState, ITestPlayerState> {
  plugins = {
    timer: new TimerPlugin(),
    command: new CommandPlugin()
  };
  maxPlayers = 2;
  onInit() {
    this.plugins.command
      .on("test.state", (pl, { randomId }) => {
        console.log("statttttttttte!");
        this.command(pl, "test.stated", { randomId });
      })
      .on("test.timer", (player, payload) => {
        const randomId = payload.randomId;
        let count = 0;

        this.plugins.timer.setInterval(() => {
          console.log("owo");
          if (++count % 5 === 0) this.command(player, "fuck.it", { randomId });
        }, 500);
      });
  }
}
