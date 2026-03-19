# Contributing Guidelines

Thank you for contributing to 2048! This document explains the conventions, workflow, and manual test checklist for contributors.

---

## Table of Contents

- [Ground Rules](#ground-rules)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Code Conventions](#code-conventions)
- [File Responsibilities](#file-responsibilities)
- [Making Changes](#making-changes)
- [Manual Test Checklist](#manual-test-checklist)
- [Pull Request Process](#pull-request-process)
- [Things to Avoid](#things-to-avoid)

---

## Ground Rules

- There is **no build step** — the project runs directly in a browser
- There is **no test framework** — all testing is manual and in-browser
- There is **no backend** — all state lives in `localStorage`
- `script.js` and `index.html` are **legacy** — do not extend them
- Keep changes focused; do not refactor code outside the scope of your task

---

## Branch Naming

All branches must follow this pattern:

```
claude/<short-description>-<id>
```

Examples:
```
claude/add-hint-system-abc123
claude/fix-game-over-condition-xyz789
claude/daily-challenge-board-load-def456
```

The `<id>` is a short alphanumeric identifier (session ID or ticket ID).

---

## Commit Messages

Use the **imperative mood** in the subject line. Structure:

```
<Short summary (≤ 72 chars)>

<Optional body: what changed and why, not how>

https://claude.ai/code/session_<id>
```

Examples:
```
Fix game-over input handling allowing moves after win

When the player wins on the last limited-mode move, both won and over
can be true simultaneously. The previous condition (over && !won) allowed
continued input in that case. Changed to check only this.over.
```

```
Add Keep Going button for classic mode wins
```

```
Fix CSS :contains() pseudo-class for difficulty badges

:contains() is not a valid CSS selector. Replaced with [data-difficulty]
attribute selectors and added matching data attributes to menu.html.
```

---

## Code Conventions

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Variables & functions | `camelCase` | `handleMoveResult` |
| Classes | `PascalCase` | `Game2048`, `ReplayManager` |
| localStorage keys | `kebab-case` with `game2048-` prefix | `game2048-settings` |
| CSS classes | `kebab-case` | `tile-container`, `hint-indicator` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_UNDOS`, `MOVE_KEYS` |

### JavaScript

- Use ES6+ features: `const`/`let`, arrow functions, template literals, optional chaining
- Class-based OOP for stateful components
- Avoid inline styles in JS — add CSS classes instead
- Check for `null` before accessing DOM elements:
  ```js
  if (this.hintButton) {
      this.hintButton.addEventListener('click', () => this.showHint());
  }
  ```
- Guard `localStorage` reads with `readJson()` — never call `JSON.parse()` on localStorage values directly in new code

### CSS

- All styles belong in `style.css` — avoid inline styles
- Use CSS custom properties for values shared across themes
- New animations go at the bottom of the file, above the `@media` blocks
- Responsive overrides go inside the existing `@media (max-width: ...)` block at the bottom

### HTML

- Use semantic elements where appropriate
- All interactive elements need an `id` if referenced by JS, or a class if styled
- `aria-*` attributes for overlays and live regions are already in place — maintain them

---

## File Responsibilities

| File | Add here | Do NOT add here |
|------|----------|-----------------|
| `game.js` | Game logic, tile mechanics, power-ups | Page-specific menu logic |
| `shared.js` | Utilities used by ≥ 2 pages | Page-specific DOM manipulation |
| `menu.js` | Menu/settings/leaderboard UI | Game logic |
| `style.css` | All visual styles | — |
| `script.js` | Nothing — legacy, do not modify | — |
| `index.html` | Nothing — legacy, do not modify | — |

---

## Making Changes

1. **Read the relevant files first.** Understand existing patterns before modifying.
2. **Check `shared.js`** for existing utilities before writing new ones.
3. **Test in multiple browsers** — Chrome + Firefox minimum.
4. **Test on mobile** — use DevTools device emulation or a real device.
5. **Check all three themes** — Cold, Warm, Dark.
6. **Check all five game modes** — a bug in one mode may hide in another.
7. **Run through the manual test checklist** (see below) for any change that touches `game.js`.

### Development loop

```bash
# Serve the project
python3 -m http.server 8080
# Open http://localhost:8080/title.html

# Edit a file
# Refresh the browser (no build needed)
# Check DevTools Console for errors
```

Useful console helpers on `game.html`:

```js
game.grid            // current board state
game.getBestMove()   // test hint logic
game.move('left')    // manually trigger a move
game.renderBoard()   // re-render after manual mutation
```

---

## Manual Test Checklist

Run this checklist before opening a pull request for any change to `game.js`, `shared.js`, `game.html`, or `style.css`.

### Core gameplay
- [ ] Two tiles appear on a new game
- [ ] Arrow keys move tiles in the correct direction
- [ ] Swipe (mobile / DevTools emulation) moves tiles correctly
- [ ] Tiles merge when equal values collide
- [ ] Score increments by the value of merged tiles
- [ ] A new random tile appears after every successful move
- [ ] No tile appears after a move that changes nothing
- [ ] Best score persists after page refresh

### Game-over detection
- [ ] "Game over!" appears when the board is full with no merges possible
- [ ] No further moves are accepted after game over
- [ ] "Try again" restarts the game correctly

### Win / Keep Going (Classic)
- [ ] "You win!" appears when a 2048 tile is created
- [ ] "Keep Going" button is visible on win overlay
- [ ] Clicking Keep Going dismisses the overlay and allows further moves
- [ ] "Try again" restarts the game correctly

### Undo
- [ ] Undo button shows `Undo (3)` at game start
- [ ] Undo reverts the board and score to the previous state
- [ ] Counter decrements correctly (3 → 2 → 1 → 0)
- [ ] Button is disabled (greyed out) when count reaches 0
- [ ] An invalid move (nothing moves) does not consume an undo charge
- [ ] Ctrl+Z / Cmd+Z triggers undo
- [ ] Undo count resets to 3 on "New Game"

### Hint & Assist
- [ ] Hint button shows a toast and board arrow
- [ ] H key shows the hint
- [ ] Arrow disappears after 2.5 s
- [ ] Assist toggle changes button label between On / Off
- [ ] Assist mode shows an arrow after each successful move
- [ ] Arrow does not appear after an invalid (no-op) move in assist mode

### Game modes
- [ ] Classic: win condition fires at 2048
- [ ] Timed: timer counts down; "Time's up!" on zero; no further input
- [ ] Limited: move counter decrements; "No moves left!" at zero
- [ ] Endless: no win message even at 2048
- [ ] Daily: seeded board loads correctly; target score shown; marks completed when score reached

### Leaderboard & achievements
- [ ] Score is saved to leaderboard on game end (any mode)
- [ ] Leaderboard shows correct entries for each mode
- [ ] Achievement toast appears when a badge is newly unlocked
- [ ] Win streak increments on win; resets on loss
- [ ] Streak Weaver achievement unlocks at streak = 3

### Score milestones
- [ ] Toast appears when crossing 500, 1000, 2000, 5000, etc.
- [ ] Same milestone does not toast twice in one game
- [ ] Milestones reset when starting a new game

### Settings
- [ ] Settings persist after page refresh
- [ ] Theme changes apply to the game board
- [ ] Animation speed visibly changes tile slide speed
- [ ] Sound toggle enables/disables ambient audio
- [ ] Grid lines toggle shows/hides grid lines

### Tutorial
- [ ] Tutorial overlay appears on first visit
- [ ] "Got it" dismisses permanently
- [ ] "Show later" dismisses temporarily (shows again next load)
- [ ] Tutorial button re-opens the overlay at any time

---

## Pull Request Process

1. Create your branch: `git checkout -b claude/<description>-<id>`
2. Make your changes
3. Run through the relevant parts of the manual test checklist
4. Commit with a clear message (see [Commit Messages](#commit-messages))
5. Push: `git push -u origin claude/<description>-<id>`
6. Open a pull request targeting `main`
7. Describe what was changed and why in the PR body
8. Link to any related issues

---

## Things to Avoid

| Do not | Reason |
|--------|--------|
| Extend `script.js` | Legacy file — isolated from the active game flow |
| Link to `index.html` in navigation | Standalone legacy file; shares only `best2048` with the active app |
| Add game logic to `menu.js` | Belongs in `game.js` or `shared.js` |
| Add page-specific DOM code to `shared.js` | `shared.js` must remain page-agnostic |
| Use `JSON.parse(localStorage.getItem(...))` directly | Use `readJson()` which handles errors gracefully |
| Call `document.execCommand()` for new clipboard code | Use the Clipboard API with the existing `navigator.clipboard.writeText` pattern |
| Push to `main` directly | All changes must go through a branch and PR |
| Use `--no-verify` to skip hooks | Fix the underlying hook issue instead |
