import { logger } from "react-native-logs";
import { writeLog, type LogLevel } from "./logDb";

const log = logger.createLogger({
  severity: __DEV__ ? "debug" : "error",
});

/**
 * Ekstrak stacktrace penuh termasuk inner exception (err.cause) untuk
 * debugging. Detail ini HANYA disimpan di log DB & dikirim saat user
 * memilih "Kirim Log" — tidak pernah ditampilkan di UI aplikasi
 * (LogViewerScreen tetap memakai format ringkas sekarang).
 */
function extractStack(err: unknown): string | undefined {
  const chain: string[] = [];
  let current: unknown = err;
  const seen = new Set<unknown>();
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    chain.push(current.stack ?? `${current.name}: ${current.message}`);
    current = current.cause;
  }
  if (chain.length === 0) return undefined;
  return chain.join("\n\nCaused by: ");
}

function stringifyArgs(args: unknown[]): { message: string; details?: string; stack?: string } {
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
  // Cari Error pertama (termasuk di rest args) untuk menangkap stack + cause.
  const errorArg = args.find((a): a is Error => a instanceof Error);
  const details = rest.length > 0 ? rest.map(stringify).join(" ") : undefined;
  return { message, details, stack: errorArg ? extractStack(errorArg) : undefined };
}

function persist(level: LogLevel, args: unknown[]) {
  const { message, details, stack } = stringifyArgs(args);
  void writeLog({ level, source: "app", message, details, stack }).catch(() => {
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
