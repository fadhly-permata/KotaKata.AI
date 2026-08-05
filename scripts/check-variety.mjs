// Ukur variasi kata antar papan: generate 5 papan dari tier 1, hitung
// tumpang-tindih kata antar papan.
globalThis.__DEV__ = false;

const { generateBoard } = await import("../src/domain/usecases/crosswordGenerator.ts");
const { TIER_1_WORDS } = await import("../src/data/vocabulary/tier1.ts");

const candidates = TIER_1_WORDS.map(([word, clue_1, clue_2, clue_3], i) => ({
  word,
  word_id: `t1-${String(i + 1).padStart(3, "0")}`,
  clue_1,
  clue_2,
  clue_3,
  tier_level: 1,
}));

const boards = [];
for (let i = 0; i < 5; i++) {
  const b = generateBoard(candidates, 10, 1);
  boards.push(new Set(b.words.map((w) => w.word)));
  console.log(`papan ${i + 1}: ${b.words.length} kata — ${[...boards[i]].slice(0, 12).join(", ")}`);
}

// Overlap maks antara dua papan
let maxOverlap = 0;
let pair = "";
for (let i = 0; i < boards.length; i++) {
  for (let j = i + 1; j < boards.length; j++) {
    const inter = [...boards[i]].filter((w) => boards[j].has(w)).length;
    if (inter > maxOverlap) {
      maxOverlap = inter;
      pair = `papan ${i + 1} & ${j + 1}`;
    }
  }
}
const union = new Set();
for (const s of boards) for (const w of s) union.add(w);
console.log(`\nKata unik total (dari ${boards.reduce((a, s) => a + s.size, 0)} slot): ${union.size}`);
console.log(`Overlap maks antar 2 papan: ${maxOverlap} kata (${pair})`);
