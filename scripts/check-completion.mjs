// Verify that a board ALWAYS completes (never stuck at 100%) in any fill order.
// Simulates: typing letters + the GameScreen auto-solve effect (solve any
// complete & correct word) + fully-revealed / crossing-locked edge cases.
// Usage: bun scripts/check-completion.mjs
globalThis.__DEV__ = false;

const { generateBoard } = await import("../src/domain/usecases/crosswordGenerator.ts");
const { isWordComplete, validateWord } = await import("../src/domain/usecases/wordValidator.ts");
const { TIER_1_WORDS } = await import("../src/data/vocabulary/tier1.ts");

const candidates = TIER_1_WORDS.map(([word, clue_1, clue_2, clue_3], i) => ({
  word,
  word_id: `t1-${String(i + 1).padStart(3, "0")}`,
  clue_1,
  clue_2,
  clue_3,
  tier_level: 1,
}));

// Mirrors markWordSolved's side effects (mutate board in place).
function solveWord(board, i) {
  const w = board.words[i];
  w.solved = true;
  for (const c of w.cells) c.isLocked = true;
}

// Mirrors the GameScreen auto-solve effect: after each change of filledLetters,
// solve every unsolved word that is complete AND correct (no skip for locked/
// revealed words — that skip was the source of the "stuck at 100%" bug).
function runEffect(board, filled) {
  let solved = 0;
  for (let i = 0; i < board.words.length; i++) {
    const w = board.words[i];
    if (w.solved) continue;
    if (isWordComplete(w, filled) && validateWord(w, i, filled).isCorrect) {
      solveWord(board, i);
      solved++;
    }
  }
  return solved;
}

function allFilled(board, filled) {
  for (const row of board.grid) {
    for (const cell of row) {
      if (cell.isBlocked) continue;
      if (!filled[`${cell.row},${cell.col}`] && !cell.isLocked) return false;
    }
  }
  return true;
}

// Type a single correct letter into a cell (letter from the word that owns it).
// Cek rentang harus mengikuti orientasi kata yang sebenarnya — kalau tidak,
// kata vertikal bisa "mencuri" sel-sel kata horizontal yang menyeberang di
// sel pertamanya (simulasi jadi menulis huruf yang salah).
function typeLetter(board, filled, cell) {
  const key = `${cell.row},${cell.col}`;
  if (filled[key]) return;
  for (const w of board.words) {
    if (w.orientation === "horizontal") {
      if (w.startRow === cell.row && cell.col >= w.startCol && cell.col < w.startCol + w.word.length) {
        filled[key] = w.word[cell.col - w.startCol];
        return;
      }
    } else {
      if (w.startCol === cell.col && cell.row >= w.startRow && cell.row < w.startRow + w.word.length) {
        filled[key] = w.word[cell.row - w.startRow];
        return;
      }
    }
  }
}

// --- Test drivers -----------------------------------------------------------

let failures = 0;

function assert(name, cond) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ FAIL: ${name}`);
  }
}

// 1) Word-by-word fill order.
function testSequential(board) {
  const filled = {};
  for (const w of board.words) {
    for (const c of w.cells) {
      if (filled[`${c.row},${c.col}`]) continue;
      typeLetter(board, filled, c);
      runEffect(board, filled);
    }
  }
  const done = board.words.every((w) => w.solved);
  const filled100 = allFilled(board, filled);
  if (!done && filled100) {
    for (let i = 0; i < board.words.length; i++) {
      const w = board.words[i];
      if (!w.solved) {
        const complete = isWordComplete(w, filled);
        const res = validateWord(w, i, filled);
        console.log(
          `      DEBUG unsolved: "${w.word}" complete=${complete} correct=${res.isCorrect} filled="${res.filled}" locked=${w.cells.filter((c) => c.isLocked).length}/${w.cells.length}`,
        );
      }
    }
  }
  assert(
    `sequential fill (${board.words.length} words) → completes (filled100=${filled100})`,
    done && filled100,
  );
}

// 2) Random-letter fill order (letters shuffled).
function testRandom(board, seed) {
  const filled = {};
  const cells = [];
  for (const row of board.grid) {
    for (const cell of row) {
      if (!cell.isBlocked) cells.push(cell);
    }
  }
  // deterministic shuffle
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (const c of cells) {
    typeLetter(board, filled, c);
    runEffect(board, filled);
  }
  const done = board.words.every((w) => w.solved);
  const filled100 = allFilled(board, filled);
  assert(
    `random fill seed=${seed} (${cells.length} cells) → completes (filled100=${filled100})`,
    done && filled100,
  );
}

// 3) Fully-revealed LAST word must still complete the board (0 XP handled by
//    markWordSolved, not by skipping the solve).
function testRevealedLastWord(board) {
  const filled = {};
  // Solve all words EXCEPT the last one by typing them directly.
  for (let i = 0; i < board.words.length - 1; i++) {
    const w = board.words[i];
    for (const c of w.cells) {
      typeLetter(board, filled, c);
    }
    runEffect(board, filled);
  }
  // Now "reveal" the last word: fill its letters + mark all its cells as
  // revealed (as revealWord would). The effect must still solve it.
  const last = board.words[board.words.length - 1];
  for (const c of last.cells) {
    const key = `${c.row},${c.col}`;
    if (!filled[key]) typeLetter(board, filled, c);
  }
  runEffect(board, filled);
  assert(
    `fully-revealed last word ("${last.word}") → board still completes`,
    last.solved && board.words.every((w) => w.solved),
  );
}

// 4) Crossing-locked words: a word whose cells are all filled & locked by other
//    solved words must still be solved by the effect (old code skipped it).
function testCrossingLocked(board) {
  const filled = {};
  for (const w of board.words) {
    for (const c of w.cells) {
      typeLetter(board, filled, c);
    }
    runEffect(board, filled);
  }
  runEffect(board, filled); // final pass
  const unsolvedComplete = board.words.filter(
    (w) => !w.solved && isWordComplete(w, filled) && validateWord(w, board.words.indexOf(w), filled).isCorrect,
  );
  assert(
    `no complete+correct word left unsolved (${unsolvedComplete.length} found)`,
    unsolvedComplete.length === 0,
  );
}

// --- Run --------------------------------------------------------------------

console.log("Generating boards...");
for (let b = 0; b < 8; b++) {
  const board = generateBoard(candidates, 10, 1); // size 10, tier 1
  console.log(`\nBoard ${b + 1}: ${board.words.length} words`);
  testSequential(structuredClone(board));
  testRandom(structuredClone(board), b + 1);
  testRandom(structuredClone(board), b + 101);
  testRevealedLastWord(structuredClone(board));
  testCrossingLocked(structuredClone(board));
}

console.log(failures === 0 ? "\nALL PASS ✅" : `\n${failures} FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
