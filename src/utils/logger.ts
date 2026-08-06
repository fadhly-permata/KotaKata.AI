import { logger } from "react-native-logs";
import { writeLog, type LogLevel } from "./logDb";

const log = logger.createLogger({
  severity: __DEV__ ? "debug" : "error",
});

function stringifyArgs(args: unknown[]): { message: string; details?: string } {
  if (args.length === 0) return { message: "(kosong)" };
  const [first, ...rest] = args;
  const stringify = (v: unknown): string => {
    if (v instanceof Error) return v.message;
    if (typeof v === "string") return v;
    if (typeof v === "undefined") return "undefined";
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };
  const message = stringify(first);
  const details = rest.length > 0 ? rest.map(stringify).join(" ") : undefined;
  return { message, details };
}

function persist(level: LogLevel, args: unknown[]) {
  const { message, details } = stringifyArgs(args);
  void writeLog({ level, source: "app", message, details }).catch(() => {
    // Log DB tidak boleh mengganggu alur utama.
  });
}

export const loggerDebug = (...args: unknown[]) => {
  log.debug(...args);
};

export const loggerInfo = (...args: unknown[]) => {
  log.info(...args);
};

export const loggerWarn = (...args: unknown[]) => {
  log.warn(...args);
  persist("warn", args);
};

export const loggerError = (...args: unknown[]) => {
  log.error(...args);
  persist("error", args);
};

export default log;
