# Troubleshooting Guide

This document covers common issues for both end users and developers.

---

## Table of Contents

- [For Players](#for-players)
- [For Developers](#for-developers)
- [Resetting Game Data](#resetting-game-data)
- [Browser Console Diagnostics](#browser-console-diagnostics)

---

## For Players

### The game doesn't load / shows a blank page

**Cause:** Opening `index.html` instead of `title.html`, or a file-path issue.

**Fix:**
1. Make sure you are opening **`title.html`**, not `index.html`
2. If you are opening it as a local file (`file://`), some browsers block certain features. Use a local server instead:
   ```bash
   python3 -m http.server 8080
   # then open http://localhost:8080/title.html
   ```

---

### No sound / ambient music

**Cause:** Browsers block audio until the user has interacted with the page (autoplay policy).

**Fix:**
1. Click any button on the page first, then the audio will start
2. Check that **Sound & Ambient** is turned on in Settings
3. Check your device volume and that the browser tab is not muted

---

### My scores / achievements / settings are gone

**Cause:** Browser storage was cleared (cookies, cache, or site data reset).

**Fix:** There is no way to recover lost data — everything is stored locally in `localStorage`. To avoid this in future, do not use private/incognito mode, and do not clear site data for the domain where you host the game.

---

### The undo button is greyed out

**Cause:** Either you have used all 3 undos for this game, or undo is disabled in Settings.

**Fix:**
- Start a new game to restore 3 undo charges
- Go to Settings → Power-Ups → enable **Time Stitch**

---

### The hint / assist doesn't suggest what I expect

**Cause:** The hint algorithm scores moves by `(score gain × 2) + (empty cells × 10)`. It prioritises opening space and immediate merges, but does not look multiple moves ahead. It may not always match an expert strategy.

This is expected behaviour, not a bug.

---

### The daily challenge button is disabled

**Cause:** You have already completed today's challenge. Each daily challenge can only be played once.

**Fix:** Wait until midnight for the next day's challenge to unlock.

---

### The game freezes or tiles stop responding

**Cause:** Usually caused by the game entering a `game-over` or `won` state where input is intentionally blocked.

**Fix:**
1. Check whether a "Game over!" or "You win!" overlay is showing — click "Try again" or "Keep Going"
2. If no overlay is visible, open the browser console and check for JavaScript errors (see [Browser Console Diagnostics](#browser-console-diagnostics))
3. Hard-refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

---

### Tiles appear at the wrong position on mobile

**Cause:** Tile positions are calculated in pixels (`col × 122px`). On very small screens the grid may overflow or scale unexpectedly.

**Fix:** The game is designed for screens ≥ 320 px wide. On smaller screens, zoom out in the browser settings. A responsive pixel-grid calculation improvement is a known future work item.

---

## For Developers

### JavaScript errors on load: `Cannot read properties of null`

**Cause:** A DOM element expected by `Game2048` was not found — usually caused by editing `game.html` and removing or renaming an element with a specific `id`.

**Fix:** Cross-reference the IDs referenced in the `Game2048` constructor with what exists in `game.html`:

| Expected ID | Used for |
|-------------|---------|
| `tile-container` | Tile rendering |
| `score` | Score display |
| `best` | Best score display |
| `game-message` | Win / game-over overlay |
| `current-mode` | Mode name in header |
| `timer` | Timed mode countdown |
| `moves` | Limited mode counter |
| `daily-target-display` | Daily mode target |
| `replay-toast` | Toast notifications |
| `tutorial-overlay` | Tutorial overlay |
| `tutorial-toggle` | Tutorial button |
| `tutorial-dismiss` | "Got it" button |
| `tutorial-skip` | "Show later" button |
| `export-replay` | Download replay button |
| `copy-replay` | Copy replay button |
| `hint-button` | Hint button |
| `undo-button` | Undo button |
| `assist-toggle` | Assist toggle button |
| `hint-indicator` | Arrow indicator on board |

---

### Settings saved in menu don't apply in game

**Cause:** `game.js` loads settings with `JSON.parse(localStorage.getItem('game2048-settings'))` directly, while `menu.js` saves via `settingsManager.save()` which goes through `mergeSettings()`. Both read/write the same key (`game2048-settings`), so they should be in sync.

**Debugging steps:**
```js
// In the browser console on game.html
console.log(localStorage.getItem('game2048-settings'));
console.log(game.settings);
```
If they differ, the settings form may have been submitted before `shared.js` loaded. Verify that `shared.js` is listed in `<script>` tags **before** `menu.js` in `menu.html`.

---

### Daily challenge loads a random board instead of the seeded one

**Cause:** `launchDailyChallenge()` in `menu.js` must write to `game2048-daily-active` before redirecting. If the redirect happens before the write completes (rare), or if the key is cleared between pages, `game.js` gets `null`.

**Debugging steps:**
```js
// On menu.html before clicking Play Daily
console.log(localStorage.getItem('game2048-daily-active'));

// On game.html after loading
console.log(game.dailyChallenge);
```
If `game.dailyChallenge` is `null`, the active challenge was not in storage when the game loaded.

---

### Achievements are never unlocking

**Cause (historical, now fixed):** `achievementManager.evaluate()` was not being called. This was corrected — it is now called in `handleMoveResult` after every successful move.

**If still not unlocking:**
```js
// Check what's stored
console.log(JSON.parse(localStorage.getItem('game2048-achievements')));

// Check the current game state passed to evaluate
// (called automatically, but you can test manually)
achievementManager.evaluate({
  highestTile: Math.max(...game.grid.flat()),
  score: game.score,
  dailyCompleted: 0,
  winStreak: 0
});
```

---

### Win streak is not incrementing

**Cause:** The streak is updated in `persistLeaderboard()`, which is called only once per game. If you restart before the game ends naturally (timer, moves exhausted, or board full), the streak is not updated.

**Debugging:**
```js
localStorage.getItem('game2048-win-streak');  // should be a number string
```
To reset manually: `localStorage.removeItem('game2048-win-streak')`

---

### Undo uses a charge even when the move didn't change the board

**Cause (historical, now fixed):** `saveUndoState()` was called before `move()`, and the slot was not reclaimed for no-op moves. This is now fixed — if `move()` returns `false`, the last pushed state is immediately popped.

---

### CSS theme not applying

**Cause:** The theme is applied as `document.documentElement.dataset.theme = 'cold'` (sets `data-theme` on `<html>`). If CSS selectors do not match, the theme silently falls back to un-themed styles.

**Fix:** Open DevTools → Elements, select `<html>`, and verify `data-theme` is set. Check `style.css` for selectors like `[data-theme="cold"] .tile-2 { ... }`.

---

### `script.js` / `index.html` conflicts

**Cause:** `index.html` is a self-contained legacy version that includes `script.js`. If loaded instead of `title.html`, a different `GameManager` class runs. These files share some `localStorage` keys (`best2048`) but are otherwise isolated.

**Fix:** Always use `title.html` as the entry point. Do not link to `index.html` in navigation.

---

## Resetting Game Data

### Reset everything (browser console)

```js
Object.keys(localStorage)
  .filter(k => k.startsWith('game2048') || k === 'best2048')
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

### Reset specific data

```js
localStorage.removeItem('best2048');                  // best score
localStorage.removeItem('game2048-settings');         // settings
localStorage.removeItem('game2048-leaderboard');      // all leaderboards
localStorage.removeItem('game2048-achievements');     // badges
localStorage.removeItem('game2048-daily');            // challenge history
localStorage.removeItem('game2048-daily-active');     // active challenge
localStorage.removeItem('game2048-tutorial-dismissed'); // re-show tutorial
localStorage.removeItem('game2048-win-streak');       // win streak
```

---

## Browser Console Diagnostics

Open DevTools with `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac), then go to the **Console** tab.

### Quick state inspection (on game.html)

```js
game.grid           // current board
game.score          // current score
game.over           // true if game ended
game.won            // true if player won
game.currentMode    // active mode
game.undoStack      // undo history
game.settings       // loaded settings
game.dailyChallenge // daily challenge data (or null)
game.getBestMove()  // returns best direction string
```

### Simulate a move

```js
game.move('left')   // mutates the board directly (bypasses undo/score)
game.renderBoard()  // update DOM after manual mutation
```

### Force-unlock an achievement (for testing)

```js
const ids = JSON.parse(localStorage.getItem('game2048-achievements') || '[]');
ids.push('tile_2048');
localStorage.setItem('game2048-achievements', JSON.stringify(ids));
```
