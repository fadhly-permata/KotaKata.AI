// Reproduksi: board yang di-serialize lalu di-deserialize (alur resume) —
// apakah sel kata solved bisa diedit lagi lewat grid?
globalThis.__DEV__ = false;

const { useGameStore } = await import("../../src/presentation/stores/gameStore.ts");
const { generateBoard } = await import("../../src/domain/usecases/crosswordGenerator.ts");
const { TIER_1_WORDS } = await import("../../src/data/vocabulary/tier1.ts");
const { serializeBoardProgress, deserializeBoardProgress } = await import("../../src/utils/boardProgress.ts");

const candidates = TIER_1_WORDS.map(([word, clue_1, clue_2, clue_3], i) => ({
  word,
  word_id: `t1-${String(i + 1).padStart(3, "0")}`,
  clue_1,
  clue_2,
  clue_3,
  tier_level: 1,
}));

const store = () => useGameStore.getState();

let writesIntoSolved = 0;
for (let b = 0; b < 20; b++) {
  const board = generateBoard(candidates, 10, 1);
  const progress = { board, filledLetters: {}, hints: {}, currentXp: 0, wordsSolved: 0, totalXp: 0 };
  const resumed = deserializeBoardProgress(serializeBoardProgress(progress));
  if (!resumed) continue;
  useGameStore.getState().setBoard(resumed.board);
  const w0 = resumed.board.words[0];

  // Solve word 0 dengan mengetik penuh
  store().selectCell(w0.cells[0].row, w0.cells[0].col);
  for (const ch of w0.word) store().inputLetter(ch);
  if (!w0.solved) continue;

  const w0Keys = new Set(w0.cells.map((c) => `${c.row},${c.col}`));

  // Cek identitas grid vs word cell SETELAH deserialize
  const c0 = w0.cells[0];
  if (resumed.board.grid[c0.row][c0.col] !== c0) {
    console.log(`papan#${b}: IDENTITAS RUSAK setelah deserialize!`);
  }

  // Tap + ketik di SETIAP sel word 0
  for (const c of w0.cells) {
    const key = `${c.row},${c.col}`;
    store().selectCell(c.row, c.col);
    const before = { ...store().filledLetters };
    store().inputLetter("Z");
    const after = store().filledLetters;
    const newKeys = Object.keys(after).filter((k) => before[k] !== after[k]);
    for (const nk of newKeys) {
      if (w0Keys.has(nk)) {
        writesIntoSolved++;
        console.log(`❌ papan#${b} "${w0.word}" tap(${key}) → huruf 'Z' tertulis KE SEL SOLVED (${nk})`);
      }
    }
    // bersihkan
    for (const nk of newKeys) {
      const st = store();
      useGameStore.setState({ filledLetters: { ...st.filledLetters, [nk]: undefined } });
      const fb = { ...useGameStore.getState().filledLetters };
      delete fb[nk];
      useGameStore.setState({ filledLetters: fb });
    }
  }
}
console.log(writesIntoSolved === 0 ? "✅ 0 tulisan ke sel solved" : `💥 ${writesIntoSolved} KALI huruf tertulis ke sel solved!`);
console.log("DONE");
