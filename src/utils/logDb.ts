import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import initSqlJs from "sql.js/dist/sql-wasm-browser.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm";
import type { Database, SqlJsStatic } from "sql.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
  /** Stacktrace penuh + inner exception — disimpan utk debugging, TIDAK ditampilkan di UI. */
  stack?: string;
  createdAt: number; // epoch ms
}

const DB_KEY = "kotakata_logdb_v1";
const FALLBACK_KEY = "kotakata_logdb_fallback_v1";
const MAX_ROWS = 500;
const PERSIST_DELAY_MS = 600;

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let initPromise: Promise<boolean> | null = null;

// Cadangan kalau sql.js tidak bisa dimuat (mis. runtime native tanpa WASM).
let fallbackRows: LogEntry[] = [];
let fallbackNextId = 1;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Helpers base64 (hanya dipakai jalur sql.js di web)
// ---------------------------------------------------------------------------
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Inisialisasi
// ---------------------------------------------------------------------------
async function doInit(): Promise<boolean> {
  try {
    SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const stored = await AsyncStorage.getItem(DB_KEY);
    let bytes: Uint8Array | null = null;
    if (stored) {
      try {
        bytes = base64ToBytes(stored);
      } catch {
        bytes = null;
      }
    }
    db = bytes && bytes.length > 0 ? new SQL.Database(bytes) : new SQL.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        stack TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);
    `);
    // DB lama (sebelum kolom stack ada) — tambahkan kolom secara aman.
    try {
      db.run("ALTER TABLE logs ADD COLUMN stack TEXT");
    } catch {
      // kolom sudah ada — abaikan
    }
    trimRows();
    return true;
  } catch (err) {
    console.warn("[logDb] sql.js tidak tersedia, pakai penyimpanan cadangan", err);
    SQL = null;
    db = null;
    try {
      const raw = await AsyncStorage.getItem(FALLBACK_KEY);
      if (raw) {
        fallbackRows = JSON.parse(raw) as LogEntry[];
        fallbackNextId = fallbackRows.reduce((max, r) => Math.max(max, r.id + 1), 1);
      }
    } catch {
      fallbackRows = [];
    }
    return false;
  }
}

/** Panggil sekali di awal app. Aman dipanggil berulang. */
export function initLogDb(): Promise<boolean> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

function isReady(): Database | null {
  return db;
}

function trimRows() {
  if (!db) return;
  db.run(`DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT ${MAX_ROWS});`);
}

// ---------------------------------------------------------------------------
// Persistensi (debounced export sql.js → base64 → AsyncStorage)
// ---------------------------------------------------------------------------
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistNow();
  }, PERSIST_DELAY_MS);
}

async function persistNow() {
  const database = isReady();
  if (!database) return;
  try {
    const bytes = database.export();
    await AsyncStorage.setItem(DB_KEY, bytesToBase64(bytes));
  } catch (err) {
    console.warn("[logDb] gagal menyimpan database log", err);
  }
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------
export interface WriteLogInput {
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
  /** Stacktrace + inner exception — disimpan utk debugging, TIDAK ditampilkan di UI. */
  stack?: string;
}

export async function writeLog(input: WriteLogInput): Promise<void> {
  const { level, source, message, details, stack } = input;
  // PLAN-080: error dicoba kirim otomatis ke Supabase (jalan walau belum
  // login — RPC publik). Fire-and-forget: gagal/offline = diam saja, entri
  // tetap tersimpan di log DB lokal & bisa dikirim manual setelah login.
  if (level === "error") {
    const cloudEntry: LogEntry = { id: 0, level, source, message, details, stack, createdAt: Date.now() };
    void queueCloudReport(cloudEntry);
  }
  try {
    await initLogDb();
    const createdAt = Date.now();
    const database = isReady();
    if (!database) {
      fallbackRows.push({ id: fallbackNextId++, level, source, message, details, stack, createdAt });
      if (fallbackRows.length > MAX_ROWS) {
        fallbackRows = fallbackRows.slice(fallbackRows.length - MAX_ROWS);
      }
      await AsyncStorage.setItem(FALLBACK_KEY, JSON.stringify(fallbackRows));
      return;
    }
    database.run("INSERT INTO logs (level, source, message, details, stack, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
      level,
      source,
      message,
      details ?? null,
      stack ?? null,
      createdAt,
    ]);
    trimRows();
    scheduleSave();
  } catch (err) {
    console.warn("[logDb] gagal menulis log", err);
  }
}

// ---------------------------------------------------------------------------
// PLAN-080: pengiriman otomatis error ke Supabase (pre-login friendly)
// ---------------------------------------------------------------------------
let lastCloudSendAt = 0;

/**
 * Kirim satu entri error ke cloud lewat logReportRepository.sendPublic.
 * Import dilakukan LAZY (require di dalam fungsi) supaya tidak ada circular
 * dependency saat evaluasi modul (logDb adalah modul low-level; repository
 * → supabase → logger → logDb).
 */
async function queueCloudReport(entry: LogEntry): Promise<void> {
  // Anti-spam: maksimal satu pengiriman cloud per 3 detik.
  const now = Date.now();
  if (now - lastCloudSendAt < 3000) return;
  lastCloudSendAt = now;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logReportRepository } = require("../data/repositories/logReportRepository") as {
      logReportRepository: { sendPublic: (e: LogEntry) => Promise<boolean> };
    };
    await logReportRepository.sendPublic(entry);
  } catch {
    // Offline / client belum siap — abaikan; entri tetap ada di log lokal.
  }
}

export async function getLogs(options?: { level?: LogLevel; limit?: number }): Promise<LogEntry[]> {
  const level = options?.level;
  const limit = Math.min(options?.limit ?? 200, MAX_ROWS);
  try {
    await initLogDb();
    const database = isReady();
    if (!database) {
      let rows = [...fallbackRows].reverse();
      if (level) rows = rows.filter((r) => r.level === level);
      return rows.slice(0, limit);
    }
    const where = level ? "WHERE level = ?" : "";
    const params: Array<string | number> = level ? [level, limit] : [limit];
    const res = database.exec(
      `SELECT id, level, source, message, details, stack, created_at FROM logs ${where} ORDER BY id DESC LIMIT ?`,
      params,
    );
    const entries: LogEntry[] = [];
    for (const r of res) {
      const col = (name: string) => r.columns.indexOf(name);
      for (const row of r.values) {
        entries.push({
          id: Number(row[col("id")]),
          level: row[col("level")] as LogLevel,
          source: String(row[col("source")] ?? ""),
          message: String(row[col("message")] ?? ""),
          details: row[col("details")] != null ? String(row[col("details")]) : undefined,
          stack: row[col("stack")] != null ? String(row[col("stack")]) : undefined,
          createdAt: Number(row[col("created_at")]),
        });
      }
    }
    return entries;
  } catch (err) {
    console.warn("[logDb] gagal membaca log", err);
    return [];
  }
}

export interface LogCounts {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
}

export async function getLogCounts(): Promise<LogCounts> {
  const counts: LogCounts = { total: 0, debug: 0, info: 0, warn: 0, error: 0 };
  try {
    await initLogDb();
    const database = isReady();
    if (!database) {
      for (const r of fallbackRows) {
        counts.total += 1;
        counts[r.level] += 1;
      }
      return counts;
    }
    const res = database.exec("SELECT level, COUNT(*) FROM logs GROUP BY level");
    for (const r of res) {
      for (const row of r.values) {
        const lvl = row[0] as LogLevel;
        const n = Number(row[1]);
        counts.total += n;
        counts[lvl] = n;
      }
    }
    return counts;
  } catch (err) {
    console.warn("[logDb] gagal membaca statistik log", err);
    return counts;
  }
}

export async function clearLogs(): Promise<void> {
  try {
    await initLogDb();
    const database = isReady();
    if (!database) {
      fallbackRows = [];
      fallbackNextId = 1;
      await AsyncStorage.setItem(FALLBACK_KEY, JSON.stringify([]));
      return;
    }
    database.run("DELETE FROM logs;");
    await persistNow();
  } catch (err) {
    console.warn("[logDb] gagal menghapus log", err);
  }
}

/** Flush data yang masih pending (dipakai saat app akan ditutup / pindah halaman). */
export async function flushLogDb(): Promise<void> {
  try {
    await initLogDb();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await persistNow();
  } catch {
    // abaikan
  }
}

// ---------------------------------------------------------------------------
// Tangkapan error global → otomatis masuk log DB
// ---------------------------------------------------------------------------
function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || String(err);
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function formatStack(err: unknown): string | undefined {
  if (err instanceof Error && err.stack) return err.stack;
  if (err && typeof err === "object") {
    const anyErr = err as { stack?: unknown };
    return typeof anyErr.stack === "string" ? anyErr.stack : undefined;
  }
  return undefined;
}

/**
 * Ekstrak stacktrace penuh termasuk inner exception (err.cause) untuk
 * debugging. Sama seperti extractStack di logger.ts — di-duplikasi di sini
 * karena logDb adalah modul low-level yang tidak boleh import logger
 * (cycle dependency).
 */
function extractFullStack(err: unknown): string | undefined {
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

let globalLoggingInstalled = false;

/**
 * Pasang penangkap error global (RN ErrorUtils + web window/error &
 * unhandledrejection) supaya setiap issue otomatis tercatat ke log DB.
 */
export function setupGlobalLogging(): void {
  if (globalLoggingInstalled) return;
  globalLoggingInstalled = true;

  try {
    // React Native: error fatal / error global di JS thread.
    const g = globalThis as unknown as {
      ErrorUtils?: {
        setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
        getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | null;
      };
    };
    if (g.ErrorUtils && typeof g.ErrorUtils.setGlobalHandler === "function") {
      const previous = g.ErrorUtils.getGlobalHandler?.() ?? null;
      g.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        void writeLog({
          level: "error",
          source: "global",
          message: formatError(error),
          // Format ringkas tetap di details; stack penuh disimpan terpisah
          // supaya UI tidak berubah, debugging tetap lengkap.
          details: isFatal ? "Fatal" : undefined,
          stack: formatStack(error) ?? formatError(error),
        });
        if (typeof previous === "function") {
          previous(error, isFatal);
        }
        // Fatal error → jangan biarkan layar putih tanpa petunjuk (PLAN-076):
        // tampilkan pesan errornya langsung ke user supaya bisa dilaporkan.
        if (isFatal) {
          try {
            Alert.alert("Terjadi error", formatError(error).slice(0, 800));
          } catch {
            // abaikan — Alert tidak tersedia di fase ini
          }
        }
      });
    }
  } catch (err) {
    console.warn("[logDb] gagal memasang ErrorUtils handler", err);
  }

  try {
    // Web: error window + promise rejection yang tidak tertangani.
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("error", (event) => {
        void writeLog({
          level: "error",
          source: "window",
          message: event.message || "Uncaught error",
          stack: event.error ? (formatStack(event.error) ?? formatError(event.error)) : undefined,
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        void writeLog({
          level: "error",
          source: "promise",
          message: "Unhandled promise rejection",
          details: reason instanceof Error ? undefined : formatError(reason),
          stack: reason instanceof Error ? extractFullStack(reason) : formatError(reason),
        });
      });
      window.addEventListener("pagehide", () => {
        void flushLogDb();
      });
    }
  } catch (err) {
    console.warn("[logDb] gagal memasang web handler", err);
  }
}
