# KotaKata.AI — Phase 5: User Profile, History & Theme

## Objective
Build profile page, word discoveries history ("Sejarah Saya") with search, save/resume boards, and complete theme system.

## Steps
1. Profile screen:
   - Current tier display (poetic name + philosophy text)
   - XP progress bar toward next tier
   - Total coins
   - Stats: boards completed, words discovered, hints used
   - Account actions: logout, link anonymous → permanent
2. History screen ("Sejarah Saya"):
   - FlashList (`@shopify/flash-list`) for performant word list
   - Chronological sort (newest first)
   - Search bar: filter by word text or clue content
   - Bottom sheet (`@gorhom/bottom-sheet`) on item tap: show full word details + all 3 clues
3. Save/Resume system:
   - Auto-save board state when leaving game
   - Load saved boards from local DB
   - Main menu: list saved boards with status badges (in-progress / completed)
   - Delete saved board option
4. Theme system completion:
   - Light mode: `#FFFFFF` active cells, `#E0E0E0` borders, navy text, dark blocked cells
   - Dark mode: `#1E1E1E` active cells, `#333333` borders, `#F5F5F5` text, `#121212` blocked cells
   - 300ms fade transition via Reanimated
   - Persist user preference in Local Storage
   - Default: respect OS `useColorScheme`
5. Settings screen:
   - Theme selector (Light / Dark / System)
   - Sound toggle (placeholder for future)
   - Clear local data option
   - App version & about
