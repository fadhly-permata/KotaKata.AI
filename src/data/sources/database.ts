import { createRxDatabase, type RxDatabase } from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import {
  USER_SCHEMA,
  VOCABULARY_SCHEMA,
  WORD_DISCOVERY_SCHEMA,
  SAVED_BOARD_SCHEMA,
  type UserDoc,
  type VocabularyDoc,
  type WordDiscoveryDoc,
  type SavedBoardDoc,
} from "../models/schemas";
import { VOCABULARY_SEED } from "./vocabularySeed";
import { loggerInfo } from "../../utils/logger";

type Collections = {
  users: import("rxdb").RxCollection<UserDoc>;
  vocabulary: import("rxdb").RxCollection<VocabularyDoc>;
  word_discoveries: import("rxdb").RxCollection<WordDiscoveryDoc>;
  saved_boards: import("rxdb").RxCollection<SavedBoardDoc>;
};

let db: RxDatabase<Collections> | null = null;

/**
 * Initialize local RxDB database (singleton).
 * Call once at app startup.
 */
export async function initDatabase(): Promise<RxDatabase<Collections>> {
  if (db) return db;

  db = await createRxDatabase<Collections>({
    name: "kotakata",
    storage: getRxStorageMemory(),
  });

  await db.addCollections({
    users: { schema: USER_SCHEMA },
    vocabulary: { schema: VOCABULARY_SCHEMA },
    word_discoveries: { schema: WORD_DISCOVERY_SCHEMA },
    saved_boards: { schema: SAVED_BOARD_SCHEMA },
  });

  loggerInfo("Local database initialized");
  return db;
}

/** Get the database instance (throws if not initialized) */
export function getDatabase(): RxDatabase<Collections> {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

/**
 * Initialize the database (if needed) and seed the vocabulary from VOCABULARY_SEED
 * when the collection is empty. Call once before generating boards.
 */
export async function ensureVocabularySeeded(): Promise<void> {
  await initDatabase();

  const count = await db!.vocabulary.count().exec();
  if (count > 0) return;

  const now = new Date().toISOString();
  const docs: VocabularyDoc[] = VOCABULARY_SEED.map((w) => ({
    // tier is not stored on seed items — derive it from the word_id prefix ("t1-001" → 1)
    word_id: w.word_id,
    word: w.word,
    clue_1: w.clue_1,
    clue_2: w.clue_2,
    clue_3: w.clue_3,
    tier_level: Number(w.word_id.match(/^t(\d+)/)?.[1] ?? 1),
    created_at: now,
  }));

  await db!.vocabulary.bulkInsert(docs);
  loggerInfo(`Vocabulary seeded: ${docs.length} words`);
}

/** Close and clean up the database */
export async function closeDatabase() {
  if (db) {
    db = null;
  }
}
