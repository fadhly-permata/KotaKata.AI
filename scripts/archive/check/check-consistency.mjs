// Cek apakah huruf di grid cocok dengan `word` di setiap BoardWord hasil generate.
globalThis.__DEV__ = false;
const { generateBoard } = await import("../../src/domain/usecases/crosswordGenerator.ts");
const { TIER_1_WORDS } = await import("../../src/data/vocabulary/tier1.ts");

const candidates = TIER_1_WORDS.map(([word, clue_1, clue_2, clue_3], i) => ({
  word,
  word_id: `t1-${String(i + 1).padStart(3, "0")}`,
  clue_1,
  clue_2,
  clue_3,
  tier_level: 1,
}));

let bad = 0;
for (let b = 0; b < 10; b++) {
  const board = generateBoard(candidates, 10, 1);
  for (const w of board.words) {
    const gridLetters = w.cells.map((c) => board.grid[c.row][c.col].letter).join("");
    const cellLetters = w.cells.map((c) => c.letter).join("");
    if (gridLetters !== w.word || cellLetters !== w.word) {
      bad++;
      console.log(`INCONSISTENT: "${w.word}" grid="${gridLetters}" cell="${cellLetters}"`);
    }
  }
}
console.log(bad === 0 ? "ALL CONSISTENT ✅" : `${bad} INCONSISTENT WORDS ❌`);
