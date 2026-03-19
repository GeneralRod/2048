# JavaScript API Reference

This document covers every public class, method, and module-level function in the active codebase (`game.js` and `shared.js`). Legacy files (`script.js`, `index.html`) are excluded.

---

## Table of Contents

- [game.js](#gamejs)
  - [Constants](#constants)
  - [Class: Game2048](#class-game2048)
  - [Class: ReplayManager](#class-replaymanager)
  - [Class: AmbientSoundtrack](#class-ambientsoundtrack)
  - [Standalone functions](#standalone-functions-gamejs)
- [shared.js](#sharedjs)
  - [Storage helpers](#storage-helpers)
  - [window.settingsManager](#windowsettingsmanager)
  - [window.leaderboardManager](#windowleaderboardmanager)
  - [window.dailyChallengeManager](#windowdailychallengemanager)
  - [window.achievementManager](#windowachievementmanager)
  - [Utility functions](#utility-functions)

---

## game.js

### Constants

```js
ANIMATION_SPEEDS  // { slow: 0.48, normal: 0.32, fast: 0.18 }
MOVE_KEYS         // ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
DIRECTION_ARROWS  // { left: '←', right: '→', up: '↑', down: '↓' }
MAX_UNDOS         // 3
```

```js
deepCloneGrid(grid: number[][]): number[][]
```
Returns a deep copy of the 4×4 grid array. Used before mutations to preserve snapshots.

---

### Class: Game2048

Main game engine. One instance is created on `DOMContentLoaded` and assigned to `window.game`.

#### Constructor

```js
new Game2048()
```

Initialises all state, reads stored settings and best score, sets up event listeners, and starts the game based on the `?mode=` URL parameter.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Board dimension (always `4`) |
| `grid` | `number[][]` | Current 4×4 board; `0` = empty cell |
| `score` | `number` | Score for the current game |
| `best` | `number` | All-time best score (from `localStorage`) |
| `currentMode` | `string` | Active game mode: `classic`, `timed`, `limited`, `endless`, `daily` |
| `won` | `boolean` | `true` after the player reaches 2048 in a winnable mode |
| `over` | `boolean` | `true` when the game is definitively finished (timer expired, moves exhausted, or no moves remain) |
| `undoStack` | `object[]` | Stack of `{ grid, score }` snapshots; max length = `MAX_UNDOS` |
| `assistEnabled` | `boolean` | Whether auto-hint mode is active |
| `lastMilestone` | `number` | Highest score milestone already toasted this game |
| `dailyChallenge` | `object \| null` | Active daily challenge data, or `null` |
| `settings` | `object` | Loaded settings object (see README for shape) |
| `timer` | `number \| null` | `setInterval` handle for timed mode |
| `timeLeft` | `number` | Seconds remaining in timed mode |
| `movesLeft` | `number` | Moves remaining in limited mode |

#### Game lifecycle methods

```js
initGame(): void
```
Reads `?mode=` from the URL, optionally loads the daily challenge from storage, and calls `startNewGame()`.

---

```js
startNewGame(mode: string): void
```
Resets all game state (grid, score, won, over, undoStack, milestone), applies settings, sets up the mode, adds two random starting tiles, and renders the board.

---

```js
setupMode(mode: string): void
```
Configures mode-specific UI and state:
- `timed` — sets `timeLeft = 300`, shows timer, starts interval
- `limited` — sets `movesLeft = 100`, shows move counter
- `daily` — shows target score from `dailyChallenge`
- `classic` / `endless` — no extra setup

---

```js
restart(): void
```
Shorthand for `startNewGame(this.currentMode)`. Called by the "New Game" and "Try again" buttons.

---

```js
keepGoing(): void
```
Hides the win overlay without altering game state. Allows continued play after reaching 2048 in classic mode. Input was never blocked on win (`this.over` is not set on win), so only the UI needed closing.

---

#### Move & board methods

```js
move(direction: 'left' | 'right' | 'up' | 'down'): boolean
```
Applies a move to `this.grid`. Saves `this.previousGrid` before mutating. Returns `true` if any tile moved or merged.

**Internal flow:**
1. Clones the current grid to `this.previousGrid`
2. Iterates over all rows (horizontal moves) or columns (vertical moves)
3. Calls `processLine()` on each
4. Accumulates score gain
5. Tracks merge positions in `this.mergeCells`

---

```js
processLine(line: number[], reverse: boolean): { line: number[], gain: number, mergeIndices: number[] }
```
Core merge algorithm for a single row or column.

- Filters out zeroes
- Scans left-to-right; merges adjacent equal values (each cell merges at most once)
- Pads with trailing zeroes to restore length
- If `reverse = true`, the line is reversed before processing and reversed again after (handles right/down moves)
- Returns the merged line, the score gained, and the indices of merged cells

**Example:**
```js
processLine([2, 2, 4, 0], false)
// → { line: [4, 4, 0, 0], gain: 4, mergeIndices: [0] }

processLine([0, 2, 2, 4], true)   // right-slide
// → { line: [0, 0, 4, 4], gain: 4, mergeIndices: [3] }
```

---

```js
addRandomTile(): void
```
Picks a random empty cell and places a `2` (90% chance) or `4` (10% chance).

---

```js
renderBoard(): void
```
Clears `#tile-container` and re-renders all non-zero tiles as `<div class="tile tile-N">` elements. Tiles in `this.mergeCells` receive `tile-merge` for the pop animation. Tiles with value > 2048 receive `tile-super`.

---

```js
simulateDirection(grid: number[][], direction: string): { moved: boolean, gain: number, empty: number, grid: number[][] }
```
Pure simulation of a move on an arbitrary grid without modifying game state. Used by `getBestMove()`. Returns whether the move changed anything, the score gain, the number of empty cells after, and the resulting grid.

---

```js
getBestMove(): string | null
```
Evaluates all four directions via `simulateDirection()` and scores each:

```
score = (scoreGain × 2) + (emptyCells × 10)
```

Returns the direction string with the highest score, or `null` if no move is possible.

---

```js
isGameOver(): boolean
```
Returns `true` when every cell is filled and no adjacent cells share the same value (no possible merges).

---

```js
checkGameStatus(): void
```
Called after every successful move:
- In non-endless modes: checks for a 2048 tile → sets `won = true`, shows win message, persists leaderboard
- Calls `isGameOver()` → if true, sets `over = true`, shows game-over message, persists leaderboard

---

```js
linesEqual(a: number[], b: number[]): boolean
```
Returns `true` if two arrays are element-wise identical. Used to detect no-op moves.

---

#### Score & display methods

```js
updateScore(): void
```
Updates `#score` in the DOM. If the new score exceeds `this.best`, also updates `#best` and writes to `localStorage`.

---

```js
checkMilestone(): void
```
Checks whether the current score has crossed any milestone threshold (500, 1000, 2000, 5000, 10000, 20000, 50000) since `this.lastMilestone`. Shows a toast for each newly crossed threshold.

---

```js
flashElement(element: HTMLElement, className: string): void
```
Adds a CSS class to an element for 400 ms (used for score-pulse and best-pulse animations).

---

#### Undo methods

```js
saveUndoState(): void
```
Pushes `{ grid: deepCloneGrid(this.grid), score: this.score }` onto `this.undoStack`. Does nothing if `settings.powerups.undo` is `false`. Evicts the oldest entry when the stack exceeds `MAX_UNDOS`.

> **Note:** If the subsequent move turns out to be a no-op, the caller pops the stack to reclaim the slot.

---

```js
undo(): void
```
Pops the last state from `undoStack`, restores `this.grid` and `this.score`, and re-renders. Does nothing if the stack is empty or the game is over.

---

```js
updateUndoButton(): void
```
Updates the "Undo (N)" button label and its `disabled` state.

---

#### Hint & assist methods

```js
showHint(): void
```
Calls `getBestMove()` and displays the result as a toast ("Hint: → Right") and sets the on-board hint indicator.

---

```js
setHintIndicator(direction: string): void
```
Shows the arrow character for `direction` in `#hint-indicator` (bottom-right of the board). Auto-hides after 2.5 s.

---

```js
clearHintIndicator(): void
```
Immediately hides `#hint-indicator`.

---

```js
toggleAssist(): void
```
Flips `this.assistEnabled`. When enabled, `setHintIndicator()` is called automatically after every successful move.

---

#### Achievement & persistence methods

```js
evaluateAchievements(): void
```
Builds a state snapshot `{ highestTile, score, dailyCompleted, winStreak }` and calls `achievementManager.evaluate()`. Shows a toast for each newly unlocked achievement.

---

```js
persistLeaderboard(): void
```
Called once per game (guarded by `this.leaderboardLogged`):
- Adds the current score to the leaderboard for `this.currentMode`
- Dispatches the `leaderboardUpdated` custom event
- For daily mode: calls `dailyChallengeManager.markCompleted()` if `score >= targetScore`
- Updates `game2048-win-streak` in localStorage

---

#### UI / overlay methods

```js
showMessage(text: string, className: 'game-won' | 'game-over'): void
```
Sets the game overlay text and shows/hides the "Keep Going" button (visible only when `this.won === true`).

```js
hideMessage(): void
```
Removes `game-won` / `game-over` from the overlay's class list, making it invisible.

```js
showToast(message: string): void
```
Shows a transient toast notification for 1.8 s.

```js
showTutorial() / hideTutorial() / dismissTutorial(): void
```
Controls the tutorial overlay. `dismissTutorial()` also writes `game2048-tutorial-dismissed = '1'` to localStorage so the tutorial is not shown again.

---

### Class: ReplayManager

Records every move as a snapshot for export or clipboard copy.

#### Constructor

```js
new ReplayManager(getState: () => { grid: number[][], score: number })
```

`getState` is a callback that returns the current board and score.

#### Methods

```js
reset(): void
```
Clears `history` and captures the initial board state as a `'start'` entry.

---

```js
captureSnapshot(direction: string | 'start', beforeGrid: number[][] | null): void
```
Appends an entry to `history`:
```js
{
  direction: string,
  before: number[][] | null,
  after: number[][],
  score: number,
  timestamp: number   // ms since game start
}
```

---

```js
buildPayload(meta?: object): object
```
Returns a structured replay object:
```js
{
  version: 1,
  generatedAt: string,  // ISO 8601
  settings: object,
  mode: string,
  durationMs: number,
  moves: snapshot[]
}
```

---

```js
export(meta: object): void
```
Triggers a JSON file download named `2048-replay-<mode>-<timestamp>.json`.

---

```js
async copy(meta: object): Promise<void>
```
Copies the JSON payload to the clipboard. Falls back to `document.execCommand('copy')` if the Clipboard API is unavailable.

---

### Class: AmbientSoundtrack

Synthesises a three-voice ambient pad using the Web Audio API.

#### Methods

```js
start(): void
```
Creates an `AudioContext` and three oscillators (sine + two triangles) at 174 Hz, 217 Hz, and 261 Hz. Does nothing if already playing or disabled.

```js
stop(): void
```
Fades all gains to near-zero over 1 second, then closes the `AudioContext`.

```js
setEnabled(flag: boolean): void
```
Starts or stops playback and updates `this.enabled`.

```js
isPlaying(): boolean
```
Returns `true` when at least one oscillator voice is active.

---

### Standalone functions (game.js)

```js
goToMenu(): void
```
Sets `window.location.href = 'menu.html'`. Called by the "← Menu" back button.

---

## shared.js

`shared.js` is loaded by both `menu.html` and `game.html`. It attaches managers to `window` and exports helper functions into the global scope.

### Storage helpers

```js
readJson(key: string, fallback?: any): any
```
Reads and parses a JSON value from `localStorage`. Returns `fallback` (default: `{}`) on parse error or if the key is absent.

```js
saveJson(key: string, value: any): void
```
Serialises `value` to JSON and writes it to `localStorage`.

---

### window.settingsManager

```js
settingsManager.load(): object
```
Reads `game2048-settings` from localStorage and merges it with `DEFAULT_SETTINGS` via `mergeSettings()`. Always returns a complete settings object — missing keys are filled from defaults.

```js
settingsManager.save(settings: object): object
```
Merges the provided settings with defaults and writes to `game2048-settings`. Returns the merged object.

---

### window.leaderboardManager

```js
leaderboardManager.get(mode: string): { score: number, timestamp: number }[]
```
Returns the top entries for the given mode, sorted descending by score. Returns `[]` if no entries exist.

```js
leaderboardManager.addEntry(mode: string, score: number): { score: number, timestamp: number }[]
```
Appends `{ score, timestamp: Date.now() }` to the mode's list, sorts descending, trims to the top 6 (`MAX_LEADERBOARD_ENTRIES`), and saves. Returns the updated list. Does nothing if `score <= 0`.

---

### window.dailyChallengeManager

```js
dailyChallengeManager.getChallenge(dateKey?: string): object
```
Returns the daily challenge for the given date (defaults to today in `YYYY-MM-DD` format). The challenge is deterministically generated from the date as a seed — calling this multiple times with the same date always returns the same result.

Return shape:
```js
{
  date: string,          // "2026-03-19"
  seed: number,
  board: number[][],     // pre-filled 4×4 grid (6 tiles)
  targetScore: number,   // 1024 + (seed % 4) * 128
  themeName: string,     // e.g. "Aurora Frost"
  description: string    // "Score 1152+ in Aurora Frost mode"
}
```

```js
dailyChallengeManager.isCompleted(dateKey?: string): boolean
```
Returns `true` if the given date appears in the `game2048-daily` completed array.

```js
dailyChallengeManager.markCompleted(dateKey?: string): number
```
Appends the date to the completed list (if not already present) and saves. Returns the total number of completed challenges.

```js
dailyChallengeManager.history(limit?: number): string[]
```
Returns the most recent `limit` (default: 10) completed date strings in reverse chronological order.

---

### window.achievementManager

```js
achievementManager.list(): object[]
```
Returns all 6 achievement definitions merged with their unlocked status:
```js
[{ id, title, description, check, unlocked: boolean }]
```

```js
achievementManager.summary(): { unlocked: number, total: number }
```
Returns the count of unlocked achievements and the total.

```js
achievementManager.evaluate(state: object): object[]
```
Checks every locked achievement against `state`. Unlocks qualifying achievements, persists to `game2048-achievements`, and returns the array of newly unlocked achievement objects. Returns `[]` if nothing new was unlocked.

`state` shape:
```js
{
  highestTile:    number,
  score:          number,
  dailyCompleted: number,
  winStreak:      number
}
```

---

### window.formatLeaderboardEntry

```js
formatLeaderboardEntry(entry: { score: number, timestamp: number }, index: number): string
```
Returns a human-readable string: `"1. 12340 pts · 3/19/2026, 14:32:00"`.

---

### Utility functions

```js
mergeSettings(saved?: object): object
```
Deep-merges a partial settings object with `DEFAULT_SETTINGS`. Safe to call with `undefined` or incomplete objects — all missing keys are filled from defaults.

```js
seededRandom(seed: number): number
```
Deterministic pseudo-random number in `[0, 1)` using a sine-based formula. Used to generate reproducible daily challenge boards.

```js
buildDailyBoard(seed: number): number[][]
```
Generates a 4×4 grid with exactly 6 pre-placed tiles using `seed`. The same seed always produces the same board. Tiles are `2` or `4` depending on the random value.

```js
describeChallenge(meta: { targetScore: number, themeName: string }): string
```
Returns a human-readable challenge description string.
