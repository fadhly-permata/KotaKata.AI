# KotaKata.AI — Phase 4: Game Engine & Core Gameplay

## Objective
Build the complete game engine: touch/keyboard input, hint system, XP calculation, and tier progression.

## Steps
1. Create GameStore (Zustand): board state, selected cell/word, input orientation, filled letters, hint usage, score/XP
2. Implement touch input:
   - Tap cell → select + auto-detect orientation (horizontal if adjacent cell exists, else vertical)
   - Tap selected cell → toggle orientation
   - Custom in-game keyboard component
3. Implement keyboard input (desktop/web):
   - Arrow key navigation (←↑→↓)
   - Letter keys for input
   - Backspace to clear
4. Build WordValidator: check filled cells against correct word, mark complete/incorrect
5. Implement Hint System:
   - Clue 1: shown by default
   - Clue 2: XP penalty X (e.g. 50 XP)
   - Clue 3: XP penalty Y (e.g. 100 XP)
   - Reveal Letter: XP penalty Z (e.g. 75 XP), cell becomes locked
6. Create confirmation dialogs: hint purchase, quit game, tier-up celebration
7. Build XP Engine:
   - XP gain per correct word (tier-based multiplier)
   - XP penalty for hints
   - Tier thresholds (e.g. 0→100=Tier1, 100→300=Tier2, etc.)
   - Tier recalc ONLY after board completion (not mid-game)
8. Implement board completion flow: detect all words done → show results → update discoveries → save board

## Critical Rule
> XP penalties for hints must NOT downgrade tier mid-game. Tier adjustment is calculated only on board completion or return to main menu.
