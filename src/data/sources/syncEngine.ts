import { supabase } from "./supabase";
import { getDatabase } from "./database";
import { userRepository } from "../repositories/userRepository";
import { boardRepository } from "../repositories/boardRepository";
import { wordDiscoveryRepository } from "../repositories/wordDiscoveryRepository";
import { loggerInfo, loggerWarn, loggerError } from "../../utils/logger";
import type { UserDoc, SavedBoardDoc, WordDiscoveryDoc } from "../models/schemas";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// ---- Online Check ----
function isOnline(): boolean {
  // In React Native, use NetInfo. For web fallback, check navigator.onLine.
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true; // assume online if can't check
}

// ---- Sync Functions ----

async function syncUser(user: UserDoc): Promise<void> {
  const { error } = await supabase
    .from("users")
    .upsert(
      {
        user_id: user.user_id,
        display_name: user.display_name,
        email: user.email ?? null,
        total_xp: user.total_xp,
        current_tier: user.current_tier,
        coins: user.coins,
        updated_at: user.updated_at,
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

async function syncBoard(board: SavedBoardDoc): Promise<void> {
  const { error } = await supabase
    .from("saved_boards")
    .upsert(
      {
        board_id: board.board_id,
        user_id: board.user_id,
        tier_at_generation: board.tier_at_generation,
        grid_size: board.grid_size,
        layout_data: JSON.parse(board.layout_data),
        is_finished: board.is_finished,
        updated_at: board.updated_at,
      },
      { onConflict: "board_id" },
    );
  if (error) throw error;
}

async function syncDiscovery(discovery: WordDiscoveryDoc): Promise<void> {
  // Kata & clue tidak disalin — dibaca via join ke vocabulary.word_id.
  const { error } = await supabase
    .from("word_discoveries")
    .upsert(
      {
        discovery_id: discovery.discovery_id,
        user_id: discovery.user_id,
        word_id: discovery.word_id,
        discovered_at: discovery.discovered_at,
      },
      { onConflict: "discovery_id" },
    );
  if (error) throw error;
}

// ---- Main Sync ----

/**
 * Push all local data to Supabase.
 * Called by scheduler and trigger functions.
 */
export async function syncToCloud(): Promise<void> {
  if (isSyncing) return;
  if (!isOnline()) {
    loggerWarn("Sync skipped — offline");
    return;
  }

  isSyncing = true;
  loggerInfo("Starting cloud sync...");
  let failedRows = 0;

  try {
    const db = getDatabase();

    // Sync users
    const users = await db.users.find().exec();
    for (const user of users) {
      try {
        await syncUser(user.toJSON());
      } catch (err) {
        failedRows++;
        loggerWarn("Sync user gagal (dilewati)", err);
      }
    }

    // Sync boards
    const boards = await db.saved_boards.find().exec();
    for (const board of boards) {
      try {
        await syncBoard(board.toJSON());
      } catch (err) {
        failedRows++;
        loggerWarn("Sync board gagal (dilewati)", err);
      }
    }

    // Sync discoveries — SANGAT PENTING: tiap baris di-isolasi sendiri. Kalau
    // satu baris gagal (mis. sisa baris lama yang word_id-nya tidak ada di
    // vocabulary, atau policy RLS belum ada), baris lain TETAP ikut ter-push.
    // Sebelumnya satu baris yang gagal membatalkan seluruh sync → XP & board
    // tersimpan tapi riwayat "Sejarah Saya" tidak pernah bertambah.
    const discoveries = await db.word_discoveries.find().exec();
    for (const discovery of discoveries) {
      try {
        await syncDiscovery(discovery.toJSON());
      } catch (err) {
        failedRows++;
        loggerWarn(`Sync discovery gagal (${discovery.word_id} — dilewati)`, err);
      }
    }

    loggerInfo(
      failedRows === 0
        ? "Cloud sync completed"
        : `Cloud sync selesai — ${failedRows} baris gagal (dilewati)`,
    );
  } catch (err) {
    loggerError("Cloud sync failed", err);
  } finally {
    isSyncing = false;
  }
}

// ---- Scheduler ----

/** Start periodic sync (every 5 min) */
export function startSyncScheduler(): void {
  if (syncTimer) return;
  syncTimer = setInterval(syncToCloud, SYNC_INTERVAL_MS);
  loggerInfo("Sync scheduler started (5-min interval)");
}

/** Stop periodic sync */
export function stopSyncScheduler(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    loggerInfo("Sync scheduler stopped");
  }
}

/** Trigger sync on board completion — call after player finishes a board */
export async function triggerBoardCompletionSync(): Promise<void> {
  loggerInfo("Board completion — triggering sync");
  await syncToCloud();
}
