import chalk, { Chalk } from "chalk";
import { ISocketCommand } from "./socket";
import { Player } from "./player";
import { Lobby } from "./lobby";

export const generateId = () => {
  let id = Date.now().toString();
  for (let i = 0; i < 5; i++) id += String.fromCharCode(Number(Math.floor(97 + Math.random() * (122 - 97)).toString()));
  return id;
};

export const mapValueChecker: <T>(
  map: Map<any, T>,
  exceptionCallback: (id: string) => { include: string; exclude: string }
) => (id: string, required?: boolean, predicate?: (v: T) => string | null) => T = <T>(map: any, exceptionCallback: any) => (id, has, predicate) => {
  const value = map.get(id);
  const ex = exceptionCallback(id);
  if (has !== undefined) {
    if (has && value === undefined) throw ex.exclude;
    if (!has && value !== undefined) throw ex.include;

    if (value && predicate) {
      let p = predicate(value);
      if (p) throw p;
    }
  }

  return value as T;
};

export const getTime = () => {
  const date = new Date();
  return date.toLocaleTimeString();
};

export const loggers = {
  command: (send: boolean, command: ISocketCommand, username: string) => {
    logger()
      .action("command " + (send ? "sending" : "recieve"), send ? "blue" : "cyan")
      .content(command.action, "green")
      .content(send ? ">>>" : "<<<")
      .content(username, "yellow")
      .log();
  },
  error: (message: string, author: string) => {
    // console.log(`${chalk.red(`[${getTime()}] [error]`)} ${chalk.green(message)} to ${username ? chalk.yellow(username) : `socket ${chalk.yellow(id)}`}`);
    logger()
      .action("error", "red")
      .content(message, "green")
      .content(">>>")
      .content(author, "yellow")
      .log();
  },
  lobby: (action: string, id: string) => {
    logger()
      .action(action, "magenta")
      .content(id, "yellow")
      .log();
  },
  player: (action: string, username: string) => {
    logger()
      .action(action, "magentaBright")
      .content(username, "yellow")
      .log();
  }
};

export const logger = () => {
  const colorText = (text: string, color?: keyof Chalk) => {
    if (!color) return text;
    const func = color && (chalk[color] as ((arg: string) => string));
    const c = typeof func === "function" ? func(text) : text;
    return c;
  };
  let time: string = `[${getTime()}]`;
  let action: string = "";
  let content: string[] = [];
  let payload: any;
  const Logger = class {
    action(name: string, color?: keyof Chalk) {
      time = colorText(time, color);
      action = colorText(`[${name}]`, color);
      return this;
    }
    content(text: string, color?: keyof Chalk) {
      // const func = color && (chalk[color] as ((arg: string) => string));
      // const c = typeof func === "function" ? func(text) : text;
      content.push(colorText(text, color));
      return this;
    }
    payload(data: any) {
      payload = data;
      return this;
    }

    log() {
      let msg = `${time} ${action} ${content.join(" ")}`;
      if (payload) console.log(msg + "\n", payload);
      else console.log(msg);
      return this;
    }
  };
  return new Logger();
  // return {
  //   command: (recieve: boolean, username: string, command: ISocketCommand) => {
  //     if (recieve) console.log(`${chalk.cyan(`${getTime()} [command recieve]`)} ${chalk.green(command.action)} from ${chalk.yellow(username)}`);
  //     else console.log(`${chalk.blue(`[${getTime()}] [command sending]`)} ${chalk.green(command.action)} to ${chalk.yellow(username)}`);
  //   }
  // };
};
