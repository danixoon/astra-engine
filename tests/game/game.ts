import * as _ from "lodash";
import { Lobby } from "../../lib/lobby";
import { Player } from "../../lib/player";
import { StatePartial } from "../../lib/state";

export interface ITestLobbyState {
  time: number;
  field: {
    width: number;
    height: number;
  };
}

export interface ITestPlayerState {
  score: number;
  field: number[];
}

interface IGameCell {
  type: "bomb" | "unknown" | "empty";
  bomb?: number;
}

export class TestLobby extends Lobby<ITestLobbyState, ITestPlayerState> {
  maxPlayers = 2;

  field: IGameCell[] = [];

  createLobbyState = () => ({
    time: 10,
    field: { width: 5, height: 5 }
  });

  createPlayerState = () => ({
    score: 0,
    field: [2]
  });

  onInit() {
    const lobby = this.getLobbyState();
    const { width, height } = lobby.data.field;
    this.field = _.range(width * height).map(v => ({ type: "bomb", bomb: 2 } as IGameCell));
  }

  onJoined(player: Player) {
    // this.p
    // const lState = this.getLobbyState();
    // const pState = this.getPlayerState(player);
    // lState
    //   .modify()
    //   .public(lState.data)
    //   .apply();
    // pState
    //   .modify()
    //   .public(pState.data)
    //   .apply();
    // console.log(pState.data);
  }

  onCommand(player: Player, action: string) {
    if (action === "game.ping") {
      throw "lol";
      // this.command(
      //   player,
      //   "game.pong",
      //   this.getPlayerState(player)
      //     .modify((s, c) => ({ score: 200 }))
      //     .apply()
      // );

      // this.mapPlayerState((p, s) => {
      //   const state = s
      //     .modify(s => ({ score: 10 }))
      //     .map((s, v) => ({
      //       ...v,
      //       score: `score: ${v.score}`
      //     }))
      //     .apply();

      //   this.command(p, "game.pong", state);
      // });

      // const s = this.getLobbyState().modify((s) => );

      // const ps = state
      //   .modify(s => ({ score: 10 }))
      //   .map((s, v) => ({
      //     score: `score: ${v.score}`
      //   }))
      //   .apply();

      // this.send(player, "who", ps);

      // const changes = state
      //   .edit()
      //   .modify(s => ({ score: s.score + 10 }))
      //   .apply().changes;

      // const changes = {
      //   field: [2]
      // };
      // state
      //   // Изменяем с эвентом game.field
      //   .modify("game.field")
      //   // Указываем внешние изменения
      //   .public({ field: [2] })
      //   // Указываем, что изменяется внутри
      //   .private((s, d) => ({
      //     field: d.field.concat(s.field)
      //   }))
      //   .map(s => ({}))
      //   .apply();

      // console.log(state.data);
    }
    //   // Послать данные конкретно игроку
    //   this.send(player, "game.pong");
    //   // Поменять (или нет) стейт, отправив изменения игроку (ам)
    //   this.getLobbyState()
    //     .modify("ded.inside")
    //     .state({ time: 20 })
    //     .target(player)
    //     .send();
    //   // В этом случае изменения отправляются только игроку
    //   this.getPlayerState(player)
    //     .modify("player.died")
    //     .state({ score: -1 })
    //     .payload({ nigga: true })
    //     .send();
    //   // this.playerState.get()
    // }
  }
}
