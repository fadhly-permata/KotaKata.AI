# KotaKata.AI — Phase 3: Vocabulary System & Procedural Board Generator

## Objective
Build the Indonesian vocabulary bank and the procedural crossword board generation algorithm (backtracking/greedy).

## Steps
1. Define TypeScript entities: `BoardCell`, `BoardWord`, `Board`, `WordPool`
2. Create seed data: min 500 Indonesian words across 10 tiers (50+ per tier)
   - Tier 1-2: 3-5 letter basic words
   - Tier 3-4: 5-6 letter intermediate words  
   - Tier 5-7: 6-8 letter advanced words
   - Tier 8-10: 8+ letter poetic/literary words
   - Each word requires clue_1, clue_2, clue_3
3. Build WordPoolFilter: filter by tier_level, exclude discovered words, fallback to tier-1
4. Implement CrosswordBoardGenerator:
   - Input: filtered word list, grid size (10×10 / 12×12)
   - Algorithm: place words randomly, backtrack on dead end
   - Validation: valid intersections, no orphan words, all words connected
5. Build BoardValidator: check overlapping letters, no accidental foreign words
6. Create responsive GridRenderer with React Native Skia:
   - Dynamic cell sizing via useWindowDimensions
   - Selected word highlighting
   - Orientation indicator (horizontal/vertical)

## Algorithm Notes
- Start with longest words first for better fill rate
- If word pool for current tier is insufficient, fallback to tier_level - 1
- Minimum intersection requirement: each word must cross at least 1 other word
