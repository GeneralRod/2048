# 2048 — Web Game

A polished, feature-rich browser-based implementation of the classic 2048 puzzle game. Built with pure HTML5, CSS3, and JavaScript — no dependencies, no build step.

**Author:** Robertousvandal

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Game Modes](#game-modes)
- [Controls](#controls)
- [Project Structure](#project-structure)
- [Configuration & Theming](#configuration--theming)
- [Local Storage](#local-storage)
- [Development](#development)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Quick Start

No installation required.

```bash
# Option 1 — open directly in a browser
open title.html

# Option 2 — serve locally (recommended, avoids browser file:// restrictions)
python3 -m http.server 8080
# then visit http://localhost:8080/title.html
```

The entry point is always **`title.html`**. Do not open `index.html` — that is a legacy standalone file.

---

## Features

| Feature | Description |
|---------|-------------|
| 5 game modes | Classic, Timed, Limited Moves, Endless, Daily Challenge |
| Undo (up to 3) | Roll back the last 1–3 moves per game |
| Hint system | Calculates and displays the best move |
| Assist mode | Auto-shows the best direction after every move |
| 3 visual themes | Cold (Royal Blue), Warm (Sunset), Dark (Night) |
| Leaderboard | Per-mode top-6 scores stored locally |
| Achievements | 6 unlockable badges with toast notifications |
| Win streak | Tracked across games; feeds the Streak Weaver badge |
| Daily challenges | Seeded daily board with a score target |
| Replay export | Download or copy move history as JSON |
| Ambient soundtrack | Synthesised audio via Web Audio API |
| Score milestones | Toast at 500 / 1k / 2k / 5k / 10k / 20k / 50k |
| Tutorial overlay | Shown on first visit, dismissible |
| Responsive layout | Mobile-friendly with swipe support |

---

## Game Modes

| Mode | Win Condition | Special Rule |
|------|--------------|--------------|
| Classic | Reach the 2048 tile | "Keep Going" available after winning |
| Timed | Highest score | 5-minute countdown |
| Limited Moves | Reach 2048 | Maximum 100 moves |
| Endless | None | No win condition; play indefinitely |
| Daily | Score target | Seeded board, same for everyone on a given day |

---

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| Arrow keys | Move tiles |
| `Ctrl`+`Z` / `Cmd`+`Z` | Undo last move |
| `H` | Show hint |

### Mouse / Touch

| Input | Action |
|-------|--------|
| Swipe (≥ 30 px) | Move tiles |
| Tap buttons | All UI actions |

---

## Project Structure

```
2048/
├── title.html          # Entry point — title screen
├── title.js            # Title screen routing
├── menu.html           # Hub: settings, leaderboard, achievements, daily
├── menu.js             # Menu logic (settings form, leaderboard, daily card)
├── game.html           # Game board UI
├── game.js             # Core game engine — Game2048 + ReplayManager classes
├── shared.js           # Cross-page utilities: persistence, leaderboard,
│                       #   achievements, daily challenge, settings manager
├── style.css           # All styling: themes, animations, responsive layout
├── index.html          # Legacy standalone version (not in main flow)
├── script.js           # Legacy game manager (do not extend)
├── CHANGELOG.md        # Release history
└── docs/
    ├── API.md          # JavaScript class & function reference
    ├── ARCHITECTURE.md # System design and data flow
    ├── CONTRIBUTING.md # Contributor guidelines
    ├── TROUBLESHOOTING.md
    └── USER_GUIDE.md   # Non-technical user guide
```

### Navigation Flow

```
title.html
    └── menu.html
            ├── game.html?mode=classic
            ├── game.html?mode=timed
            ├── game.html?mode=limited
            ├── game.html?mode=endless
            └── game.html?mode=daily
```

---

## Configuration & Theming

Settings are saved automatically to `localStorage` when the user clicks **Save** in the Settings screen. The settings object shape:

```js
{
  animationSpeed: 'normal',   // 'slow' | 'normal' | 'fast'
  soundEffects: true,         // boolean
  gridLines: true,            // boolean
  theme: 'cold',              // 'cold' | 'warm' | 'dark'
  boardSize: 4,               // currently only 4 is used
  powerups: {
    cleanse: true,            // Void Pulse power-up
    double:  false,           // Flux Surge power-up
    undo:    true             // Time Stitch / undo enabled
  },
  ambientVolume:    0.45,
  percussionVolume: 0.35,
  fxVolume:         0.40
}
```

Themes are applied via `data-theme` on `<html>`: `cold`, `warm`, or `dark`.

---

## Local Storage

All state is browser-local — there is no backend or user account system.

| Key | Type | Contents |
|-----|------|----------|
| `best2048` | `number` | All-time best score |
| `game2048-settings` | `JSON` | User settings object (see above) |
| `game2048-leaderboard` | `JSON` | `{ classic: [...], timed: [...], ... }` |
| `game2048-achievements` | `JSON` | Array of unlocked achievement IDs |
| `game2048-daily` | `JSON` | `{ completed: ['2026-03-19', ...] }` |
| `game2048-daily-active` | `JSON` | Current daily challenge object |
| `game2048-tutorial-dismissed` | `'1'` | Set when tutorial is dismissed |
| `game2048-win-streak` | `number` | Current consecutive win count |

To reset all game data:

```js
// In the browser DevTools console
Object.keys(localStorage)
  .filter(k => k.startsWith('game2048') || k === 'best2048')
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## Development

### Prerequisites

- Any modern browser (Chrome, Firefox, Safari, Edge)
- Optional: Python 3 or any static file server

### Workflow

1. Edit the relevant `.html`, `.js`, or `.css` file.
2. Refresh the browser — no compilation needed.
3. Use **DevTools → Console** for debugging (`game` is exposed as a global on the game page).

```js
// Useful console commands during development
game.grid           // current 4×4 board state
game.score          // current score
game.settings       // loaded settings object
game.undoStack      // saved undo states
game.getBestMove()  // returns the hint direction string
```

### No Test Suite

Testing is currently manual and in-browser. See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the manual test checklist.

---

## Documentation

| Document | Audience | Location |
|----------|----------|----------|
| This README | Everyone | `README.md` |
| Architecture overview | Developers | `docs/ARCHITECTURE.md` |
| JavaScript API reference | Developers | `docs/API.md` |
| User guide | End users / stakeholders | `docs/USER_GUIDE.md` |
| Troubleshooting | Everyone | `docs/TROUBLESHOOTING.md` |
| Contributing guide | Contributors | `docs/CONTRIBUTING.md` |
| Changelog | Everyone | `CHANGELOG.md` |

---

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for branch naming, commit message conventions, and the manual testing checklist.

---

## Browser Support

| Browser | Minimum version |
|---------|----------------|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

Web Audio API and CSS custom properties are required. Audio starts only after the first user interaction (browser autoplay policy). All other features work without audio.
