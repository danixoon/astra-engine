import { ILobbyPlugin } from "..";
import { generateId } from "../utils";

/**Плагин безопасного таймера в пределах лобби */
export class TimerPlugin implements ILobbyPlugin {
  beforeEvent() {}
  afterEvent(e: string) {
    if (e !== "lobby.dispose") return;

    this.timers.forEach((v, k) => {
      this.clearTimer(k);
    });
  }
  public timers: Map<string, NodeJS.Timeout> = new Map();
  /**Устанавливает таймаут на ms секунд */
  public setTimeout = (cb: () => void, ms: number): string => {
    const id = "t" + generateId();
    const timeout = setTimeout(() => {
      cb();
      this.clearTimer(id);
    }, ms);
    this.timers.set(id, timeout);
    return id;
  };
  public setInterval = (cb: () => void, ms: number): string => {
    const id = "i" + generateId();
    const timeout = setInterval(() => cb(), ms);
    this.timers.set(id, timeout);
    return id;
  };
  public clearTimer = (id: string) => {
    const timer = this.timers.get(id);
    if (!timer) return;
    if (id.startsWith("t")) clearTimeout(timer);
    else if (id.startsWith("i")) clearInterval(timer);
  };
}
