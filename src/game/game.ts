import { Lobby } from "../engine/lobby";
import { Player } from "../engine/player";

export interface ITestLobbyState {
  time: number;
}

export interface ITestPlayerState {
  score: number;
}

export class TestLobby extends Lobby<ITestLobbyState, ITestPlayerState> {
  maxPlayers = 10;

  createLobbyState = () => ({ time: 10 });
  createPlayerState = () => ({ score: 5 });

  onJoined(p) {
    this.getLobbyState()
      .modify("joined.inside")
      .state({ time: -200 })
      .send();
  }

  onCommand(player: Player, action: string) {
    if (action === "game.ping") {
      // Послать данные конкретно игроку
      this.send(player, "game.pong");
      // Поменять (или нет) стейт, отправив изменения игроку (ам)
      this.getLobbyState()
        .modify("ded.inside")
        .state({ time: 20 })
        .target(player)
        .send();

      // В этом случае изменения отправляются только игроку
      this.getPlayerState(player)
        .modify("player.died")
        .state({ score: -1 })
        .payload({ nigga: true })
        .send();
      // this.playerState.get()
    }
  }
}
