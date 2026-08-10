/**
 * Preload untuk `bun test` — menyediakan environment minimal yang dipakai
 * source code:
 *  - `__DEV__` (global React Native, dipakai src/utils/logger.ts)
 *  - mock modul logger — menghindari react-native-logs + logDb (sql.js wasm)
 *    yang bergantung environment RN/browser dan tidak berjalan di Bun.
 */
(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

import { mock } from "bun:test";

mock.module("../src/utils/logger", () => ({
  loggerDebug: () => {},
  loggerInfo: () => {},
  loggerWarn: () => {},
  loggerError: () => {},
}));
