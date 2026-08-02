// Generates supabase/vocabulary.sql from src/data/sources/vocabularySeed.ts
// Usage: node scripts/gen-vocab-sql.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "..", "src", "data", "sources", "vocabularySeed.ts");
const outPath = join(__dirname, "..", "supabase", "vocabulary.sql");

const src = readFileSync(seedPath, "utf8");

// Each seed item looks like:
//   { word_id: "t1-001", word: "API", clue_1: "...", clue_2: "...", clue_3: "..." },
const rowRe = /\{\s*word_id:\s*"([^"]+)",\s*word:\s*"([^"]+)",\s*clue_1:\s*"([^"]*)",\s*clue_2:\s*"([^"]*)",\s*clue_3:\s*"([^"]*)"\s*\}/g;

const sql = (s) => `'${s.replace(/'/g, "''").replace(/"/g, '\\"')}'`;

const rows = [];
let m;
while ((m = rowRe.exec(src)) !== null) {
  const [, word_id, word, clue_1, clue_2, clue_3] = m;
  const tier = Number((word_id.match(/^t(\d+)/) || [])[1] || 1);
  rows.push(
    `  (${sql(word_id)}, ${sql(word)}, ${sql(clue_1)}, ${sql(clue_2)}, ${sql(clue_3)}, ${tier})`,
  );
}

if (rows.length === 0) {
  console.error("No vocabulary rows parsed — check regex vs seed file format.");
  process.exit(1);
}

const out = `-- ============================================================
-- KotaKata AI — Vocabulary (soal / pertanyaan)
-- Generated from src/data/sources/vocabularySeed.ts
-- Total: ${rows.length} words across 10 tiers
-- ============================================================

create table if not exists public.vocabulary (
  word_id    text primary key,
  word       text not null,
  clue_1     text not null,
  clue_2     text,
  clue_3     text,
  tier_level int  not null default 1,
  created_at timestamptz not null default now()
);

insert into public.vocabulary (word_id, word, clue_1, clue_2, clue_3, tier_level) values
${rows.join(",\n")}
on conflict (word_id) do nothing;

create index if not exists idx_vocabulary_tier on public.vocabulary (tier_level);
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out);
console.log(`Wrote ${rows.length} rows → ${outPath}`);
