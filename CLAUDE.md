# CLAUDE.md — AI Assistant Guide for 2048

## Project Overview

A polished, feature-rich **web-based 2048 puzzle game** built with vanilla HTML5, CSS3, and JavaScript. No external dependencies, no build tools — runs directly in a browser by opening `title.html`.

**Author:** Robertousvandal
**Stack:** Pure client-side web (HTML/CSS/JS), localStorage for persistence, Web Audio API for sound.

---

## Repository Structure

```
/
├── title.html      # Entry point — title screen with navigation buttons
├── title.js        # Title screen routing logic
├── menu.html       # Hub: settings, leaderboard, achievements, daily challenges
├── menu.js         # Menu functionality (228 lines)
├── game.html       # Game board UI: grid, score, controls, tutorial overlay
├── game.js         # Core game engine (577 lines) — primary game implementation
├── shared.js       # Shared utilities: persistence, leaderboard, achievements, audio (227 lines)
├── style.css       # All styling: themes, animations, responsive layout (866 lines)
├── index.html      # Legacy/alternate standalone entry point (not the main flow)
├── script.js       # Legacy game manager (428 lines) — older implementation, not actively used
└── README.md       # Minimal author dedication
```

### Navigation Flow

```
title.html → menu.html → game.html
                      ↘ leaderboard / achievements (modal)
```

---

## Key Architecture

### Classes

| Class | File | Responsibility |
|-------|------|----------------|
| `Game2048` | `game.js` | Core game engine — grid, moves, scoring, win/loss detection |
| `ReplayManager` | `game.js` | Records move history; supports export/copy as JSON |
| `AmbientSoundtrack` | `shared.js` | Synthesized ambient audio via Web Audio API |
| `GameManager` | `script.js` | Legacy alternative implementation (do not use for new features) |

### Data Persistence (localStorage)

All state is stored client-side. Keys:

| Key | Contents |
|-----|----------|
| `best2048` | All-time best score |
| `game2048-settings` | User settings object |
| `game2048-leaderboard` | Per-mode leaderboard entries |
| `game2048-achievements` | Unlocked achievement IDs |
| `game2048-daily-*` | Daily challenge state (keyed by date) |

Utility functions in `shared.js`: `readJson(key)`, `saveJson(key, value)`.

### Game Grid

- 4×4 array of integers (0 = empty)
- Tile values are powers of 2 (2, 4, 8, … 2048, …)
- Move directions: `'left'`, `'right'`, `'up'`, `'down'`
- Core logic: `slideAndMerge()` / `processLine()` in `game.js`

### Game Modes

| Mode | Description |
|------|-------------|
| `classic` | Default — reach 2048 to win |
| `timed` | 5-minute countdown |
| `limited` | 100-move limit |
| `endless` | No win condition |

### Theming System

Three CSS themes toggled via `data-theme` attribute on `<body>`:

- `cold` — Royal Blue (default)
- `warm` — Sunset
- `dark` — Night

### Settings Object Shape

```js
{
  animationSpeed: 'normal', // 'slow' | 'normal' | 'fast'
  soundEffects: true,
  gridLines: true,
  theme: 'cold',            // 'cold' | 'warm' | 'dark'
  boardSize: 4,             // currently only 4 is used
  powerups: true
}
```

---

## Development Workflow

### Running the Project

No build step required. Open `title.html` in any modern browser:

```bash
# Option 1: Direct open
open title.html

# Option 2: Local HTTP server (avoids some browser restrictions)
python3 -m http.server 8080
# then visit http://localhost:8080/title.html
```

### Making Changes

1. Edit the relevant file(s).
2. Refresh the browser — no compilation needed.
3. Use browser DevTools console for debugging.

### No Test Suite

There is no automated test framework. All testing is manual, in-browser.

---

## Code Conventions

### Naming

- **Variables/functions:** `camelCase`
- **Classes:** `PascalCase`
- **localStorage keys:** `kebab-case` prefixed with `game2048-`
- **CSS classes:** `kebab-case`

### Patterns

- Class-based OOP for game logic and managers
- Standalone utility functions in `shared.js` for cross-page functionality
- DOM manipulation via `document.getElementById` / `querySelector`
- Events: native DOM events + custom events (e.g., `'leaderboardUpdated'`)
- Touch: swipe detection with 30px threshold
- Audio: must be started after user interaction (browser autoplay policy)

### File Responsibilities

- **Do not add game logic to `menu.js`** — keep it in `game.js` or `shared.js`
- **`script.js` is legacy** — do not extend it; new features go in `game.js`
- **`shared.js`** is the only file imported by both `menu.js` and `game.js`; keep it free of page-specific logic
- **`style.css`** handles all visual styling; avoid inline styles in JS

---

## Features Reference

| Feature | Location |
|---------|----------|
| Achievements (6 badges) | `shared.js` + `menu.html` |
| Daily challenges (seeded) | `shared.js` (`seededRandom`) + `menu.js` |
| Leaderboard (per-mode) | `shared.js` (`persistLeaderboard`) |
| Replay export/copy | `game.js` (`ReplayManager`) |
| Tutorial overlay | `game.html` |
| Ambient soundtrack | `shared.js` (`AmbientSoundtrack`) |
| Power-ups | `game.js` + `menu.js` settings |

---

## Git Workflow

- Branch naming: `claude/<description>-<id>`
- Push: `git push -u origin <branch-name>`
- Commit messages should be descriptive and imperative (e.g., "Add daily challenge reset logic")

---

## Known Caveats

- **Two implementations exist:** `game.js` (active) and `script.js` (legacy). Only extend `game.js`.
- **No routing library:** page navigation is done with `window.location.href`.
- **Web Audio API** requires a user gesture before starting; handle `AudioContext` state (`suspended` → `resume()`).
- **localStorage only:** no backend, no user accounts — all data is browser-local.
- **`index.html`** is a standalone embedded version, not part of the main title→menu→game flow; treat as legacy.
