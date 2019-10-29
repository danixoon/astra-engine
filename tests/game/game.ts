import * as _ from "lodash";
import { Lobby } from "../../lib/lobby";
import { Player } from "../../lib/player";
import { StatePartial } from "../../lib/state";

export interface ITestLobbyState {}
export interface ITestPlayerState {}

export class TestLobby extends Lobby<ITestLobbyState, ITestPlayerState> {
  maxPlayers = 2;

  onInit() {
    // this.onState("hey", () => {});
  }
  onCommand(player: Player, action: string, payload: any) {
    if (action !== "test.timer") return;
    const randomId = payload.randomId;
    let count = 0;

    this.plugins.timer.setInterval(() => {
      console.log("owo");
      if (++count % 5 === 0) this.command(player, "fuck.it", { randomId });
    }, 500);
  }
}
