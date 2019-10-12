import { Lobby } from "../engine/lobby";
import { Player } from "../engine/player";

export interface ITestLobbyState {
  time: number;
}

export class TestLobby extends Lobby<ITestLobbyState> {
  maxPlayers = 10;
  createLobbyState = () => ({ time: 10 });
  createPlayerState = () => ({ score: 5 });

  onJoined(player: Player) {}
  onCommand(player: Player, action: string) {
    if (action === "game.ping") {
      this.send(player, "game.pong");
      this.getLobbyState().send("ded.inside", { time: 20 });
      // this.playerState.get()
    }
  }
}
