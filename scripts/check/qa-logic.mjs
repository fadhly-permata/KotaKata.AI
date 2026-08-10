// ============================================================
// QA LOGIC — verifikasi logika inti game (tanpa UI/network).
// Menguji:
//   1) xpEngine  — calcTier di batas tier, calcXpGain, calcTierProgress
//   2) wordValidator — validateWord / isWordComplete / isBoardComplete
//   3) boardProgress — round-trip serialize→deserialize + relink identitas sel
//   4) crosswordGenerator — >=10 kata, semua kata valid di grid, word_id utuh
//   5) Simulasi solve penuh — total XP sesuai hitungan; mode AI = 0 XP & tier tetap
// Usage: bun scripts/check/qa-logic.mjs
// ============================================================
globalThis.__DEV__ = false;

const { generateBoard } = await import("../../src/domain/usecases/crosswordGenerator.ts");
const { isWordComplete, validateWord, isBoardComplete } = await import("../../src/domain/usecases/wordValidator.ts");
const {
  calcTier,
  calcTierProgress,
  calcXpGain,
  TIER_THRESHOLDS,
} = await import("../../src/domain/usecases/xpEngine.ts");
const { serializeBoardProgress, deserializeBoardProgress } = await import("../../src/utils/boardProgress.ts");
const { useGameStore } = await import("../../src/presentation/stores/gameStore.ts");
const { TIER_1_WORDS } = await import("../../src/data/vocabulary/tier1.ts");

let failures = 0;
const assert = (name, cond) => {
  console.log(`  ${cond ? "✓" : "✗ FAIL:"} ${name}`);
  if (!cond) failures++;
};

const candidates = TIER_1_WORDS.map(([word, clue_1, clue_2, clue_3], i) => ({
  word,
  word_id: `t1-${String(i + 1).padStart(3, "0")}`,
  clue_1,
  clue_2,
  clue_3,
  tier_level: 1,
}));

// ============================================================
// 1) XP ENGINE
// ============================================================
console.log("\n=== 1. xpEngine ===");
// Batas tier: totalXp >= threshold[tier-1] → tier itu.
TIER_THRESHOLDS.forEach((th, i) => {
  assert(`calcTier(${th}) = tier ${i + 1}`, calcTier(th) === i + 1);
  if (th > 0) assert(`calcTier(${th - 1}) = tier ${i}`, calcTier(th - 1) === i);
});
// calcXpGain: naik bersama panjang kata & tier, selalu bilangan bulat positif.
for (let tier = 1; tier <= 10; tier++) {
  for (let len = 3; len <= 10; len++) {
    const g = calcXpGain(len, tier);
    assert(`calcXpGain(len=${len}, tier=${tier}) = ${g} (>0)`, Number.isInteger(g) && g > 0);
  }
}
assert("calcXpGain(5, 2) > calcXpGain(5, 1)", calcXpGain(5, 2) > calcXpGain(5, 1));
assert("calcXpGain(6, 1) > calcXpGain(4, 1)", calcXpGain(6, 1) > calcXpGain(4, 1));
assert("calcTierProgress(0) = 0", calcTierProgress(0) === 0);
assert("calcTierProgress(max) = 1", calcTierProgress(TIER_THRESHOLDS.at(-1)) === 1);

// ============================================================
// 2) WORD VALIDATOR
// ============================================================
console.log("\n=== 2. wordValidator ===");
{
  const board = generateBoard(candidates, 10, 1);
  const w = board.words[0];
  const key = (c) => `${c.row},${c.col}`;
  // isWordComplete: penuh vs kosong
  assert(`isWordComplete("${w.word}") kosong = false`, !isWordComplete(w, {}));
  const filledAll = {};
  w.cells.forEach(
    (c) =>
      (filledAll[key(c)] = w.word[w.orientation === "horizontal" ? c.col - w.startCol : c.row - w.startRow]),
  );
  assert(`isWordComplete("${w.word}") penuh = true`, isWordComplete(w, filledAll));
  assert(`validateWord("${w.word}") benar`, validateWord(w, 0, filledAll).isCorrect);
  // Satu huruf salah → salah
  const filledWrong = { ...filledAll };
  const firstKey = key(w.cells[0]);
  filledWrong[firstKey] = filledWrong[firstKey] === "A" ? "B" : "A";
  assert(`validateWord("${w.word}") salah 1 huruf`, !validateWord(w, 0, filledWrong).isCorrect);
  // isBoardComplete dengan isLocked (semua sel di-lock tapi tidak terisi) TIDAK
  // boleh dianggap selesai — validateWord membaca huruf, bukan status lock.
  const lockedBoard = structuredClone(board);
  lockedBoard.words.forEach((ww) => ww.cells.forEach((c) => (c.isLocked = true)));
  assert("isBoardComplete (semua lock, tanpa huruf) = false", !isBoardComplete(lockedBoard, {}));
}

// ============================================================
// 3) BOARD PROGRESS round-trip (relink identitas sel)
// ============================================================
console.log("\n=== 3. boardProgress round-trip ===");
{
  const board = generateBoard(candidates, 10, 1);
  const filled = {};
  for (let i = 0; i < board.words.length; i += 2) {
    const w = board.words[i];
    w.cells.forEach((c) => {
      filled[`${c.row},${c.col}`] = w.word[c.orientation === "horizontal" ? c.col - w.startCol : c.row - w.startRow];
    });
  }
  const json = serializeBoardProgress({
    board,
    filledLetters: filled,
    hints: { 0: { clue2Used: true, clue3Used: false, revealedCells: ["1,1"] } },
    currentXp: 50,
    wordsSolved: 2,
    totalXp: 1000,
    aiMode: true,
  });
  const restored = deserializeBoardProgress(json);
  assert("deserialize tidak null", restored !== null);
  if (restored) {
    assert("aiMode dipertahankan", restored.aiMode === true);
    assert("filledLetters utuh", JSON.stringify(restored.filledLetters) === JSON.stringify(filled));
    assert("hints utuh", restored.hints?.[0]?.clue2Used === true);
    assert("wordsSolved utuh", restored.wordsSolved === 2);
    // Relink: word.cells[i] harus === grid[row][col] (identitas sama).
    let relinkOk = true;
    for (const w of restored.board.words) {
      for (const c of w.cells) {
        if (restored.board.grid[c.row][c.col] !== c) {
          relinkOk = false;
          break;
        }
      }
      if (!relinkOk) break;
    }
    assert("identitas sel di-relink (word.cells[i] === grid cell)", relinkOk);
    // Mutasi solved via word.cells harus terlihat di grid (inti bug lock).
    restored.board.words[0].solved = true;
    restored.board.words[0].cells.forEach((c) => (c.isLocked = true));
    const gridCell = restored.board.grid[restored.board.words[0].cells[0].row][restored.board.words[0].cells[0].col];
    assert("mutasi lock via word.cells terlihat di grid", gridCell.isLocked === true);
  }
  assert("deserialize('garbage') = null", deserializeBoardProgress("not json {") === null);
}

// ============================================================
// 4) CROSSWORD GENERATOR — validitas & kelengkapan
// ============================================================
console.log("\n=== 4. crosswordGenerator ===");
{
  // Replikasi alur GameScreen: coba size 10→14, ambil yang pertama dengan
  // >= 10 kata (MIN_WORDS). Fallback terakhir pakai size 14 (tanpa cek).
  const MIN_WORDS = 10;
  const MIN_GRID_SIZE = 10;
  const MAX_GRID_SIZE = 14;
  let allWordIdOk = true;
  let allPlacementOk = true;
  let fallbackBelowMin = 0;
  for (let i = 0; i < 12; i++) {
    let generated = null;
    for (let size = MIN_GRID_SIZE; size <= MAX_GRID_SIZE && !generated; size++) {
      const attempt = generateBoard(candidates, size, 1);
      if (attempt.words.length >= MIN_WORDS) generated = attempt;
    }
    if (!generated) {
      generated = generateBoard(candidates, MAX_GRID_SIZE, 1);
      if (generated.words.length < MIN_WORDS) fallbackBelowMin++;
    }
    const board = generated;
    assert(`board #${i + 1}: ${board.words.length} kata (>=${MIN_WORDS})`, board.words.length >= MIN_WORDS);
    // Setiap kata: huruf di grid cocok & semua sel tidak blocked.
    for (const w of board.words) {
      for (let j = 0; j < w.word.length; j++) {
        const r = w.orientation === "horizontal" ? w.startRow : w.startRow + j;
        const c = w.orientation === "horizontal" ? w.startCol + j : w.startCol;
        const cell = board.grid[r]?.[c];
        if (!cell || cell.isBlocked || cell.letter !== w.word[j]) allPlacementOk = false;
      }
      if (!w.word_id) allWordIdOk = false;
    }
    // Tidak boleh ada kata duplikat di satu papan.
    const words = board.words.map((w) => w.word);
    assert(`board #${i + 1}: kata unik`, new Set(words).size === words.length);
  }
  assert("semua kata punya word_id (riwayat discovery)", allWordIdOk);
  assert("semua penempatan valid di grid", allPlacementOk);
  console.log(`  → fallback size ${MAX_GRID_SIZE} di bawah ${MIN_WORDS} kata: ${fallbackBelowMin}/12 papan`);
}

// ============================================================
// 5) SIMULASI SOLVE PENUH (mirror markWordSolved + auto-solve effect)
// ============================================================
console.log("\n=== 5. simulasi solve penuh ===");
function solveWord(board, i, filled, revealedSet) {
  const w = board.words[i];
  w.solved = true;
  for (const c of w.cells) c.isLocked = true;
  const fullyRevealed =
    !!revealedSet[i]?.length &&
    w.cells.every((c) => revealedSet[i].includes(`${c.row},${c.col}`));
  const xp = fullyRevealed ? 0 : calcXpGain(w.word.length, board.tierLevel);
  return xp;
}
function runEffect(board, filled, revealed, xpAcc) {
  for (let i = 0; i < board.words.length; i++) {
    const w = board.words[i];
    if (w.solved) continue;
    if (isWordComplete(w, filled) && validateWord(w, i, filled).isCorrect) {
      xpAcc.total += solveWord(board, i, filled, revealed);
    }
  }
}
// 5a) Solve penuh normal → XP = jumlah calcXpGain semua kata
{
  const board = generateBoard(candidates, 10, 1);
  const filled = {};
  const xpAcc = { total: 0 };
  for (const w of board.words) {
    w.cells.forEach((c) => {
      filled[`${c.row},${c.col}`] = w.word[c.orientation === "horizontal" ? c.col - w.startCol : c.row - w.startRow];
    });
    runEffect(board, filled, {}, xpAcc);
  }
  const expected = board.words.reduce((s, w) => s + calcXpGain(w.word.length, 1), 0);
  assert(`semua kata solved (${board.words.length}/${board.words.length})`, board.words.every((w) => w.solved));
  assert(`XP total = ${xpAcc.total} (expected ${expected})`, xpAcc.total === expected);
  assert(`tier setelah solve (0 XP awal) tetap tier 1`, calcTier(xpAcc.total) === 1);
}

// 5b) Kata full-reveal = 0 XP (tapi board tetap selesai)
{
  const board = generateBoard(candidates, 10, 1);
  const filled = {};
  const revealed = {};
  const xpAcc = { total: 0 };
  for (let i = 0; i < board.words.length - 1; i++) {
    const w = board.words[i];
    w.cells.forEach((c) => {
      filled[`${c.row},${c.col}`] = w.word[c.orientation === "horizontal" ? c.col - w.startCol : c.row - w.startRow];
    });
    runEffect(board, filled, revealed, xpAcc);
  }
  // Reveal penuh kata terakhir (seperti revealWord): huruf diisi + semua sel di-reveal
  const last = board.words[board.words.length - 1];
  revealed[String(board.words.length - 1)] = [];
  last.cells.forEach((c) => {
    const k = `${c.row},${c.col}`;
    filled[k] = last.word[c.orientation === "horizontal" ? c.col - last.startCol : c.row - last.startRow];
    revealed[String(board.words.length - 1)].push(k);
  });
  runEffect(board, filled, revealed, xpAcc);
  const expectedWithoutLast = board.words.slice(0, -1).reduce((s, w) => s + calcXpGain(w.word.length, 1), 0);
  assert(`board selesai dengan kata terakhir full-reveal`, board.words.every((w) => w.solved));
  assert(`XP = tanpa kata reveal (${xpAcc.total} = ${expectedWithoutLast})`, xpAcc.total === expectedWithoutLast);
}

// 5c) Mode AI: XP = 0 di SEMUA jalur (markWordSolved + clue + reveal), tier tetap
{
  useGameStore.getState().reset();
  const board = generateBoard(candidates, 10, 1);
  useGameStore.getState().setBoard(board);
  useGameStore.getState().setAiMode(true);
  const s = useGameStore.getState();
  assert("aiMode aktif", s.aiMode === true);

  // pakai clue 2 & 3 + reveal letter + reveal word — XP tidak boleh berubah
  useGameStore.getState().useClue2(0);
  useGameStore.getState().useClue3(0);
  useGameStore.getState().revealLetter(1);
  useGameStore.getState().revealWord(2);
  assert("currentXp tetap 0 setelah clue+reveal (mode AI)", useGameStore.getState().currentXp === 0);

  // solve semua kata via markWordSolved (jalur inputLetter end-to-end).
  // Focus helper: sel pertama kata target; kalau sel itu persimpangan dan
  // store memilih kata lain, toggle orientasi sampai kata target aktif.
  const focusWord = (idx) => {
    const w = board.words[idx];
    const start =
      w.cells.find((c) => !useGameStore.getState().filledLetters[`${c.row},${c.col}`]) ?? w.cells[0];
    useGameStore.getState().selectCell(start.row, start.col);
    let g = 0;
    while (useGameStore.getState().selectedWordIndex !== idx && g++ < 4) {
      useGameStore.getState().toggleOrientation();
    }
  };
  useGameStore.getState().setBoard(board); // isi ulang (setBoard reset selected)
  // Auto-solve effect (mirror GameScreen): setiap perubahan filledLetters,
  // kata yang lengkap & benar langsung di-solve lewat markWordSolved.
  const autoSolve = () => {
    const st = useGameStore.getState();
    for (let i = 0; i < st.board.words.length; i++) {
      const w = st.board.words[i];
      if (w.solved) continue;
      if (isWordComplete(w, st.filledLetters) && validateWord(w, i, st.filledLetters).isCorrect) {
        st.markWordSolved(i);
      }
    }
  };
  // isi filledLetters lewat inputLetter per sel
  let guard = 0;
  while (useGameStore.getState().wordsSolved < board.words.length && guard++ < 2000) {
    autoSolve();
    const st2 = useGameStore.getState();
    const w = board.words.find((x) => !x.solved);
    if (!w) break;
    const cell = w.cells.find((c) => !st2.filledLetters[`${c.row},${c.col}`]);
    if (!cell) break;
    // Offset huruf mengikuti orientasi KATA (bukan orientasi sel — sel
    // persimpangan menyimpan orientasi kata yang terakhir memprosesnya).
    const letter = w.word[w.orientation === "horizontal" ? cell.col - w.startCol : cell.row - w.startRow];
    focusWord(board.words.indexOf(w));
    useGameStore.getState().inputLetter(letter);
    autoSolve();
  }
  autoSolve();
  const finalState = useGameStore.getState();
  assert(`mode AI: semua kata solved (${finalState.wordsSolved}/${board.words.length})`, finalState.wordsSolved === board.words.length);
  assert("mode AI: currentXp tetap 0", finalState.currentXp === 0);
  assert("mode AI: boardResult.xpGained = 0", finalState.boardResult?.xpGained === 0);
  assert("mode AI: tierChanged = false", finalState.boardResult?.tierChanged === false);
  assert("mode AI: totalXp tidak tersentuh", finalState.totalXp === 0);

  // Mode normal untuk pembanding: solve cepat → currentXp > 0
  useGameStore.getState().reset();
  const board2 = generateBoard(candidates, 10, 1);
  useGameStore.getState().setBoard(board2);
  let guard2 = 0;
  const autoSolve2 = () => {
    const st = useGameStore.getState();
    for (let i = 0; i < st.board.words.length; i++) {
      const w = st.board.words[i];
      if (w.solved) continue;
      if (isWordComplete(w, st.filledLetters) && validateWord(w, i, st.filledLetters).isCorrect) {
        st.markWordSolved(i);
      }
    }
  };
  while (useGameStore.getState().wordsSolved < board2.words.length && guard2++ < 2000) {
    autoSolve2();
    const st2 = useGameStore.getState();
    const w = board2.words.find((x) => !x.solved);
    if (!w) break;
    const cell = w.cells.find((c) => !st2.filledLetters[`${c.row},${c.col}`]);
    if (!cell) break;
    const wi = board2.words.indexOf(w);
    const start =
      w.cells.find((c) => !useGameStore.getState().filledLetters[`${c.row},${c.col}`]) ?? w.cells[0];
    useGameStore.getState().selectCell(start.row, start.col);
    let tg = 0;
    while (useGameStore.getState().selectedWordIndex !== wi && tg++ < 4) useGameStore.getState().toggleOrientation();
    const letter = w.word[w.orientation === "horizontal" ? cell.col - w.startCol : cell.row - w.startRow];
    useGameStore.getState().inputLetter(letter);
    autoSolve2();
  }
  autoSolve2();
  const normalState = useGameStore.getState();
  assert(
    `mode normal: currentXp = ${normalState.currentXp} (>0)`,
    normalState.currentXp > 0 && normalState.wordsSolved === board2.words.length,
  );
}

console.log(failures === 0 ? "\nALL PASS ✅" : `\n${failures} FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
