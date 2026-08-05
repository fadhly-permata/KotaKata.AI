import type { RxJsonSchema } from "rxdb";

// ---- Domain Types ----
export interface UserDoc {
  user_id: string;
  display_name: string;
  email?: string;
  total_xp: number;
  current_tier: number;
  coins: number;
  updated_at: string;
}

export interface VocabularyDoc {
  word_id: string;
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  tier_level: number;
  created_at: string;
}

export interface WordDiscoveryDoc {
  discovery_id: string;
  user_id: string;
  /** Referensi ke vocabulary.word_id — kata & clue dibaca lewat join, tidak diduplikasi. */
  word_id: string;
  discovered_at: string;
}

export interface SavedBoardDoc {
  board_id: string;
  user_id: string;
  tier_at_generation: number;
  grid_size: number;
  layout_data: string; // JSON stringified
  is_finished: boolean;
  updated_at: string;
}

// ---- RxDB Schemas ----
export const USER_SCHEMA: RxJsonSchema<UserDoc> = {
  title: "users",
  version: 0,
  primaryKey: "user_id",
  type: "object",
  properties: {
    user_id: { type: "string", maxLength: 100 },
    display_name: { type: "string" },
    email: { type: "string" },
    total_xp: { type: "integer", default: 0 },
    current_tier: { type: "integer", default: 1, minimum: 1, maximum: 10 },
    coins: { type: "integer", default: 0 },
    updated_at: { type: "string", format: "date-time" },
  },
  required: ["user_id", "display_name", "total_xp", "current_tier", "coins", "updated_at"],
};

export const VOCABULARY_SCHEMA: RxJsonSchema<VocabularyDoc> = {
  title: "vocabulary",
  version: 0,
  primaryKey: "word_id",
  type: "object",
  properties: {
    word_id: { type: "string", maxLength: 100 },
    word: { type: "string", maxLength: 100 },
    clue_1: { type: "string" },
    clue_2: { type: "string" },
    clue_3: { type: "string" },
    tier_level: { type: "integer", minimum: 1, maximum: 10 },
    created_at: { type: "string", format: "date-time" },
  },
  required: ["word_id", "word", "clue_1", "tier_level", "created_at"],
};

export const WORD_DISCOVERY_SCHEMA: RxJsonSchema<WordDiscoveryDoc> = {
  title: "word_discoveries",
  version: 0,
  primaryKey: "discovery_id",
  type: "object",
  properties: {
    discovery_id: { type: "string", maxLength: 100 },
    user_id: { type: "string", maxLength: 100 },
    word_id: { type: "string", maxLength: 100 },
    discovered_at: { type: "string", format: "date-time" },
  },
  required: ["discovery_id", "user_id", "word_id", "discovered_at"],
};

export const SAVED_BOARD_SCHEMA: RxJsonSchema<SavedBoardDoc> = {
  title: "saved_boards",
  version: 0,
  primaryKey: "board_id",
  type: "object",
  properties: {
    board_id: { type: "string", maxLength: 100 },
    user_id: { type: "string", maxLength: 100 },
    tier_at_generation: { type: "integer" },
    grid_size: { type: "integer" },
    layout_data: { type: "string" },
    is_finished: { type: "boolean", default: false },
    updated_at: { type: "string", format: "date-time" },
  },
  required: ["board_id", "user_id", "tier_at_generation", "grid_size", "layout_data", "updated_at"],
};
