// Verifikasi navigasi panah (navigateToCell) saat ada sel locked/blocked:
// kursor harus pindah ke sel pertama yang masih bisa diketik di arah itu
// (melompati sel locked & blocked), bukan nyangkut.
// Usage: bun scripts/check-nav-lock.mjs
globalThis.__DEV__ = false;

const { useGameStore } = await import("../src/presentation/stores/gameStore.ts");
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

let failures = 0;
const assert = (name, cond, detail = "") => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ FAIL: ${name}${detail ? `  [${detail}]` : ""}`);
  }
};

const DIRS = [
  ["up", -1, 0],
  ["down", 1, 0],
  ["left", 0, -1],
  ["right", 0, 1],
];

/** Hasil yang diharapkan: sel pertama non-blocked & non-locked di arah (dr,dc), atau null. */
function expectedTarget(board, row, col, dr, dc) {
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < board.size && c >= 0 && c < board.size) {
    const cell = board.grid[r]?.[c];
    if (cell && !cell.isBlocked && !cell.isLocked) return { row: r, col: c };
    r += dr;
    c += dc;
  }
  return null;
}

const store = () => useGameStore.getState();

/** Set kursor langsung (seperti hasil menekan panah), tanpa lewat selectCell. */
function setCursor(row, col) {
  useGameStore.setState({ selectedCell: { row, col } });
}

let boardsChecked = 0;

for (let b = 0; b < 25; b++) {
  const board = generateBoard(candidates, 10, 1);
  store().setBoard(board);

  // Solve word 0 dengan mengetik penuh → sel-selnya jadi LOCKED.
  const w0 = board.words[0];
  store().selectCell(w0.cells[0].row, w0.cells[0].col);
  for (const ch of w0.word) store().inputLetter(ch);
  if (!w0.solved) continue;
  boardsChecked++;

  const lockSet = new Set();
  for (const w of board.words) if (w.solved) for (const c of w.cells) lockSet.add(`${c.row},${c.col}`);
  const isLocked = (r, c) => lockSet.has(`${r},${c}`);

  // Dari SETIAP sel (unlocked ATAU locked) sebagai kursor, panah ke 4 arah
  // harus sampai ke sel pertama yang bisa diketik (atau diam kalau tidak ada).
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const cell = board.grid[r][c];
      if (cell.isBlocked) continue;
      for (const [dir, dr, dc] of DIRS) {
        const exp = expectedTarget(board, r, c, dr, dc);
        setCursor(r, c);
        store().navigateToCell(dir);
        const cur = store().selectedCell;
        if (exp === null) {
          assert(
            `#${b} ${isLocked(r, c) ? "locked" : ""} (${r},${c}) ${dir}: diam`,
            cur.row === r && cur.col === c,
            `got (${cur.row},${cur.col})`,
          );
        } else {
          assert(
            `#${b} ${isLocked(r, c) ? "locked" : ""} (${r},${c}) ${dir}: → (${exp.row},${exp.col})`,
            cur.row === exp.row && cur.col === exp.col,
            `got (${cur.row},${cur.col})`,
          );
        }
      }
    }
  }
}

console.log(`\n${boardsChecked} board diperiksa.`);
if (failures === 0) {
  console.log("ALL NAV OK ✅");
} else {
  console.log(`${failures} GAGAL ❌`);
  process.exit(1);
}
