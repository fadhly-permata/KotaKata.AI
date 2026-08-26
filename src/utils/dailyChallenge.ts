import { generateBoard } from "../domain/usecases/crosswordGenerator";
import { vocabularyRepository } from "../data/repositories/vocabularyRepository";
import type { Board } from "../domain/entities/board";

/**
 * Tantangan Harian (PLAN-097):
 * - Papan deterministik dari tanggal: semua pemain di hari yang sama mendapat
 *   papan dengan SEED yang sama.
 * - Tier papan berotasi per hari (dayOfYear % 10 + 1) — sama untuk semua
 *   pemain, tanpa eksklusi discoveries (papan harian memang boleh mengulang).
 * - Streak disimpan di profil user (users.daily_streak / daily_last_done).
 */

const MIN_WORDS = 10;
const MIN_GRID_SIZE = 10;
const MAX_GRID_SIZE = 14;

/** Kunci tanggal lokal YYYY-MM-DD. */
export function dailyKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Day-of-year (1..366) — dipakai rotasi tier harian. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Tier papan harian hari ini — berotasi 1..10, sama untuk semua pemain. */
export function dailyTier(date: Date = new Date()): number {
  return (dayOfYear(date) % 10) + 1;
}

/** Hash string sederhana → uint32 (seed RNG). */
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG deterministik (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Susun papan tantangan harian: pool SATU tier (tanpa eksklusi — semua pemain
 * dapat kandidat yang sama), di-shuffle dengan seed tanggal sehingga papan
 * hari ini identik untuk semua pemain dan berbeda tiap hari.
 */
export async function buildDailyBoard(date: Date = new Date(), playerTier?: number): Promise<{ board: Board; tier: number }> {
  const key = dailyKey(date);
  // Gunakan tier pemain jika tersedia; fallback ke rotasi berdasarkan hari
  const tier = (playerTier && playerTier >= 1 && playerTier <= 10) ? playerTier : dailyTier(date);
  const pool = await vocabularyRepository.getByTierFromCloud(tier, []);
  if (pool.length === 0) throw new Error("Pool kosakata harian kosong.");

  const rand = mulberry32(hashSeed(`kotakata-daily-${key}`));
  const shuffled = seededShuffle(
    pool.map((w) => ({
      word: w.word,
      word_id: w.word_id,
      clue_1: w.clue_1,
      clue_2: w.clue_2,
      clue_3: w.clue_3,
      tier_level: w.tier_level,
    })),
    rand,
  );

  let generated: Board | null = null;
  for (let size = MIN_GRID_SIZE; size <= MAX_GRID_SIZE && !generated; size++) {
    const attempt = generateBoard(shuffled, size, tier);
    if (attempt.words.length >= MIN_WORDS) generated = attempt;
  }
  if (!generated) generated = generateBoard(shuffled, MAX_GRID_SIZE, tier);
  return { board: generated, tier };
}
