# Architecture Overview

## System Summary

2048 is a fully client-side web application. There is no server, no build pipeline, and no runtime dependencies. Every feature runs in the browser using the Web platform APIs: DOM, localStorage, and the Web Audio API.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, animations, flexbox) |
| Logic | Vanilla ES6+ JavaScript (classes, arrow functions, async/await) |
| Persistence | `localStorage` (browser-local, no server) |
| Audio | Web Audio API (synthesised, no audio files) |
| Routing | `window.location.href` (no router library) |

---

## Page Structure

The app is split across three HTML pages. Navigation is done by assigning `window.location.href`.

```
┌─────────────┐     click "Play"      ┌─────────────┐    click mode     ┌────────────────────────┐
│  title.html │  ─────────────────►  │  menu.html  │  ────────────►   │  game.html?mode=<mode> │
│  (entry)    │                       │  (hub)      │                   │  (game board)          │
└─────────────┘                       └─────────────┘                   └────────────────────────┘
      ▲                                      ▲                                      │
      └──────────────── "Back" ─────────────┘◄──────────────── "Menu" ────────────┘
```

### title.html / title.js
Splash screen. Contains only navigation logic — redirects to `menu.html`.

### menu.html / menu.js
Central hub with four sections rendered on the same page:
- **Settings screen** — form that reads/writes `game2048-settings`
- **Game Modes screen** — four mode cards that navigate to game.html
- **Daily Challenge card** — shows today's challenge status and target
- **Leaderboard** — per-mode top-6 table, updates via `leaderboardUpdated` custom event
- **Achievements modal** — lists all 6 badges with locked/unlocked state
- **Challenge History modal** — shows completed daily challenge dates

### game.html / game.js
The game itself. A single `Game2048` instance is created on `DOMContentLoaded` and stored in `window.game` for console access. The game mode is read from `?mode=` URL parameter.

---

## Class Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  game.js                                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Game2048                                            │   │
│  │─────────────────────────────────────────────────── │   │
│  │ grid: number[][]          won: boolean             │   │
│  │ score: number             over: boolean            │   │
│  │ best: number              currentMode: string      │   │
│  │ undoStack: object[]       assistEnabled: boolean   │   │
│  │ lastMilestone: number     dailyChallenge: object   │   │
│  │─────────────────────────────────────────────────── │   │
│  │ move(direction)           processLine(line, rev)   │   │
│  │ simulateDirection(grid, direction)                 │   │
│  │ getBestMove()             showHint()               │   │
│  │ undo()                    keepGoing()              │   │
│  │ checkGameStatus()         isGameOver()             │   │
│  │ evaluateAchievements()    checkMilestone()         │   │
│  │ persistLeaderboard()      renderBoard()            │   │
│  └─────────────┬───────────────────────────────────── ┘   │
│                │ owns                                        │
│  ┌─────────────▼──────────────┐  ┌──────────────────────┐ │
│  │ ReplayManager              │  │ AmbientSoundtrack     │ │
│  │────────────────────────── │  │────────────────────── │ │
│  │ history: object[]         │  │ audioCtx              │ │
│  │ captureSnapshot()         │  │ start() / stop()      │ │
│  │ export() / copy()         │  │ setEnabled(flag)      │ │
│  └────────────────────────── ┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  shared.js  (loaded by both menu.html and game.html)        │
│                                                             │
│  window.settingsManager      load() / save()               │
│  window.leaderboardManager   get(mode) / addEntry()        │
│  window.dailyChallengeManager getChallenge() / markCompleted│
│  window.achievementManager   evaluate(state) / list()      │
│  window.formatLeaderboardEntry(entry, index)               │
│                                                             │
│  readJson(key, fallback)     saveJson(key, value)          │
│  mergeSettings(saved)        seededRandom(seed)            │
│  buildDailyBoard(seed)       describeChallenge(meta)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Game Move Sequence

```
User input (keydown / touchend)
    │
    ├─ saveUndoState()          ← snapshots {grid, score} onto undoStack
    │
    ├─ move(direction)
    │       ├─ processLine() × 4 rows or columns
    │       │       └─ slide + merge → returns {line, gain, mergeIndices}
    │       └─ returns: moved (boolean)
    │
    ├─ [if !moved] undoStack.pop()   ← reclaim slot for no-op moves
    │
    └─ handleMoveResult(direction, moved)
            ├─ addRandomTile()
            ├─ renderBoard()
            ├─ updateScore()          ← updates DOM + localStorage best2048
            ├─ replay.captureSnapshot()
            ├─ checkGameStatus()      ← may set won/over, call persistLeaderboard()
            ├─ checkMilestone()       ← toast at score thresholds
            ├─ evaluateAchievements() ← calls achievementManager.evaluate()
            ├─ updateUndoButton()
            └─ [if assistEnabled] setHintIndicator(getBestMove())
```

### Settings Save / Load

```
menu.html                         localStorage
  │                                    │
  ├─ DOMContentLoaded                  │
  │     └─ settingsManager.load() ────►│ reads 'game2048-settings'
  │           └─ mergeSettings()       │ fills missing keys with defaults
  │                 └─ populateSettingsForm()
  │
  ├─ User clicks Save
  │     └─ collectSettingsFromForm()
  │           └─ settingsManager.save() ──► 'game2048-settings'
  │
game.html
  ├─ Game2048 constructor
  │     └─ loadSettings() ───────────► 'game2048-settings' (raw JSON.parse)
  │           └─ applySettings()       applies theme, speed, sound
```

### Daily Challenge Flow

```
menu.html                    localStorage                  game.html
  │                               │                            │
  ├─ renderDailyCard()            │                            │
  │  dailyChallengeManager        │                            │
  │    .getChallenge(today)       │                            │
  │    (seeded, deterministic)    │                            │
  │                               │                            │
  ├─ User clicks "Play Daily"     │                            │
  │  launchDailyChallenge()       │                            │
  │    saveJson('game2048-        │                            │
  │      daily-active', challenge)►──────────────────────────►│
  │    redirect to               │                            │
  │    game.html?mode=daily      │                            │
  │                               │                            │
  │                               │          initGame()        │
  │                               │◄── readJson('game2048-    │
  │                               │      daily-active')        │
  │                               │                            │
  │                               │    startNewGame('daily')   │
  │                               │    grid = challenge.board  │
  │                               │    show target score       │
  │                               │                            │
  │                               │    [on game end]           │
  │                               │    if score >= target:     │
  │                               │      dailyChallengeManager │
  │                               │        .markCompleted()   ►│
```

---

## Persistence Layer

All data is stored in the browser's `localStorage` as JSON strings. The `readJson` / `saveJson` helpers in `shared.js` wrap the serialisation.

```
localStorage
├── best2048                      "12340"
├── game2048-settings             { animationSpeed, soundEffects, theme, ... }
├── game2048-leaderboard          { classic: [{score,timestamp},...], timed: [...] }
├── game2048-achievements         ["first_merge", "tile_512"]
├── game2048-daily                { completed: ["2026-03-18", "2026-03-19"] }
├── game2048-daily-active         { date, seed, board, targetScore, themeName, ... }
├── game2048-tutorial-dismissed   "1"
└── game2048-win-streak           "3"
```

---

## Audio Architecture

`AmbientSoundtrack` uses the Web Audio API to synthesise a three-voice pad chord:

```
AudioContext
    ├─ OscillatorNode (sine,     174 Hz)  → GainNode (0.018) ─┐
    ├─ OscillatorNode (triangle, 217 Hz)  → GainNode (0.022) ─┼─► destination
    └─ OscillatorNode (triangle, 261 Hz)  → GainNode (0.026) ─┘
```

The context is created lazily on the first user gesture to comply with the browser autoplay policy. Stopping fades gains exponentially over 1 second before disconnecting.

---

## Achievement System

Achievements are evaluated after every successful move by calling `achievementManager.evaluate(state)` with a snapshot of the current game state:

```js
{
  highestTile:    number,   // max value in the 4×4 grid
  score:          number,   // current game score
  dailyCompleted: number,   // total daily challenges completed (all-time)
  winStreak:      number    // consecutive wins from localStorage
}
```

Each achievement defines a `check(state) → boolean`. Newly unlocked IDs are appended to the `game2048-achievements` array and a toast notification is shown.

| ID | Title | Condition |
|----|-------|-----------|
| `first_merge` | First Pulse | `highestTile >= 4` |
| `tile_512` | Crystal Bloom | `highestTile >= 512` |
| `tile_2048` | Aurora Sage | `highestTile >= 2048` |
| `score_8000` | Flux Maestro | `score >= 8000` |
| `daily_5` | Chrono Voyager | `dailyCompleted >= 5` |
| `streak_3` | Streak Weaver | `winStreak >= 3` |

---

## Theming System

The active theme is set as a `data-theme` attribute on `<html>`. CSS custom properties cascade from theme-specific selectors defined in `style.css`:

```css
[data-theme="cold"]  { --tile-bg-2: #e3f2fd; /* Royal Blue family */ }
[data-theme="warm"]  { --tile-bg-2: #fff3e0; /* Sunset family */     }
[data-theme="dark"]  { --tile-bg-2: #1a1a2e; /* Night family */      }
```

---

## Known Limitations

| Limitation | Detail |
|-----------|--------|
| No backend | All data is browser-local; clearing storage loses progress |
| Single board size | `boardSize: 5` is exposed in settings UI but not implemented in `game.js` |
| No multiplayer | Scores are not shareable between devices |
| Legacy files | `index.html` and `script.js` are not part of the active flow — do not extend |
| No automated tests | All testing is manual in-browser |
