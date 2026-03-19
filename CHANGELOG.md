# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

> Changes staged for the next release go here. Move to a versioned section on release.

---

## [1.2.0] — 2026-03-19

### Added
- **Undo system** — up to 3 undos per game; respects `powerups.undo` setting; button shows remaining charges and disables at 0
- **Hint button** — calculates best move by simulating all 4 directions; shows toast + animated arrow on board
- **Assist mode** — auto-hint arrow appears after every successful move when toggled on
- **"Keep Going" button** — appears in the win overlay (Classic mode) so players can continue past 2048
- **Score milestone toasts** — notifications at 500 / 1,000 / 2,000 / 5,000 / 10,000 / 20,000 / 50,000 points
- **Achievement evaluation** — `achievementManager.evaluate()` is now called after every move; achievements were previously never unlockable
- **Win streak tracking** — stored in `localStorage` as `game2048-win-streak`; enables the Streak Weaver achievement
- **Keyboard shortcuts** — `Ctrl+Z` / `Cmd+Z` for undo; `H` for hint
- **Hint indicator element** — `#hint-indicator` arrow overlaid on the game board (bottom-right corner)

### Fixed
- **Game-over input** — `(this.over && !this.won)` condition allowed moves when both flags were true (e.g. winning on the final limited-mode move); changed to `this.over`
- **CSS `:contains()` pseudo-class** — not a valid CSS selector; replaced with `[data-difficulty]` attribute selectors; `data-difficulty` added to mode cards in `menu.html`
- **Daily challenge board** — `game.html` now reads `game2048-daily-active` from localStorage and uses the seeded board; previously always started a random game in daily mode
- **Best score display** — stored best is now shown immediately on page load instead of "0"
- **Undo wasted on no-op moves** — undo slot is reclaimed when a move does not change the board
- **Assist button label** — was "Assist: On" but default state is off; corrected to "Assist: Off"
- **Hint indicator clipping** — repositioned from `bottom: -44px` (outside container) to `bottom: 14px; right: 14px` (inside board overlay)
- **Daily challenge completion** — `dailyChallengeManager.markCompleted()` is now called when score meets the target at game end
- **Daily mode target display** — `#daily-target-display` now shown with the correct target score in daily mode

---

## [1.1.0] — 2026-03-18

### Added
- `shared.js` — cross-page module with `settingsManager`, `leaderboardManager`, `dailyChallengeManager`, `achievementManager`
- 6 achievements with `check()` functions
- Daily challenge system with seeded board generation (`seededRandom`, `buildDailyBoard`)
- Per-mode leaderboard with top-6 entries
- `ReplayManager` — records every move; supports JSON export and clipboard copy
- `AmbientSoundtrack` — synthesised three-voice pad via Web Audio API
- Tutorial overlay shown on first visit
- Three visual themes: Cold, Warm, Dark
- Settings form with animation speed, sound, grid lines, theme, board size, power-ups, volume sliders
- Timed, Limited Moves, and Endless game modes
- Touch / swipe support with 30 px threshold
- Score pulse / best pulse flash animations

### Changed
- Migrated primary game engine from `script.js` / `GameManager` to `game.js` / `Game2048`
- `title.html` → `menu.html` → `game.html` navigation flow

---

## [1.0.0] — Initial release

### Added
- Classic 2048 game on a 4×4 board
- Keyboard arrow-key input
- Score tracking with `best2048` in localStorage
- Basic tile styling and merge animation
- `index.html` standalone version (`script.js` / `GameManager`)

---

## How to maintain this file

- **When adding a feature:** add an entry under `[Unreleased] → Added`
- **When fixing a bug:** add an entry under `[Unreleased] → Fixed`
- **When changing existing behaviour:** add an entry under `[Unreleased] → Changed`
- **When removing something:** add an entry under `[Unreleased] → Removed`
- **On release:** rename `[Unreleased]` to `[X.Y.Z] — YYYY-MM-DD` and add a new empty `[Unreleased]` section at the top

### Entry format

```
- **Feature/Fix name** — one-line description of what changed and why
```

Use past tense for Fixed, present/verb form for Added and Changed.
