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

/** Close and clean up the database */
export async function closeDatabase() {
  if (db) {
    db = null;
  }
}
