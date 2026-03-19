# User Guide

Welcome to **2048**! This guide explains everything you need to play the game and make the most of its features. No technical knowledge required.

---

## Table of Contents

- [What is 2048?](#what-is-2048)
- [How to Start](#how-to-start)
- [How to Play](#how-to-play)
- [Game Modes](#game-modes)
- [Power-ups & Tools](#power-ups--tools)
- [Daily Challenge](#daily-challenge)
- [Leaderboard](#leaderboard)
- [Achievements](#achievements)
- [Settings](#settings)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## What is 2048?

2048 is a number puzzle game played on a 4×4 grid. You slide numbered tiles around the board. When two tiles with the same number collide, they **merge into one tile** with their combined value. Your goal is to create a tile with the number **2048**.

It sounds simple, but requires planning ahead to keep the board from filling up!

---

## How to Start

1. Open the game by opening **`title.html`** in your browser
   *(or visit the URL your host has set up)*
2. Click **Play** on the title screen
3. You will land on the main menu, where you can choose a game mode or adjust settings

---

## How to Play

### Moving Tiles

All tiles on the board move **at the same time** in the direction you choose.

| Device | How to move |
|--------|------------|
| Computer | Press the **Arrow keys** (↑ ↓ ← →) |
| Phone / Tablet | **Swipe** in the direction you want |

### Merging Tiles

When two tiles with the **same number** slide into each other, they merge:

```
Before pressing →

  2 | 2 | 4 | 8
  ─────────────

After pressing →

  _ | 4 | 4 | 8
```

The two `2` tiles merged into a `4`. Both tiles become one and you earn points equal to the new tile's value.

**Important rules:**
- A tile can only merge **once per move**
- You earn points equal to every merge that happens in a single move
- New tiles (value `2` or `4`) appear on the board after every move

### Winning

Reach the **2048 tile** to win! In Classic mode, you will see a "You win!" message — but you can click **Keep Going** to keep playing for a higher score.

### Losing

The game ends when the board is completely full and **no merges are possible**. You will see a "Game over!" message.

---

## Game Modes

Choose a mode from the main menu:

### Classic
The standard experience. Reach 2048 to win. After winning, click **Keep Going** to continue building your score. No time limit, no move limit.

### Timed Challenge
You have **5 minutes** to score as many points as possible. A countdown timer appears at the top. The game ends when the timer reaches zero — even if the board is not full.

*Strategy tip: focus on merging high-value tiles quickly rather than trying to reach 2048.*

### Limited Moves
You have exactly **100 moves**. Plan every slide carefully — every wasted move brings you closer to game over. The remaining move count is shown at the top.

### Endless
No win condition, no timer, no move limit. Play as long as you like and aim for the highest score possible. Great for relaxing or practising.

### Daily Challenge
A special board that is the **same for every player on a given day**. You have a specific score target to reach. Once completed, the button on the main menu will show "Completed" until the next day's challenge unlocks.

---

## Power-ups & Tools

These tools appear as buttons at the top of the game screen.

### Undo
**Button:** `Undo (N)` — the number shows how many undos you have left.

Reverses your last move. You get up to **3 undos per game**. Use them wisely! The button turns grey when you have none left.

**Keyboard shortcut:** `Ctrl + Z` (Windows / Linux) or `Cmd + Z` (Mac)

> Undo must be enabled in Settings under Power-Ups → Time Stitch.

### Hint
**Button:** `Hint`

Analyses the board and suggests the best move. The suggestion appears as:
- A **toast message** in the corner (e.g. "Hint: → Right")
- A **direction arrow** in the bottom-right of the board

**Keyboard shortcut:** `H`

### Assist Mode
**Button:** `Assist: Off` / `Assist: On`

When turned on, a direction arrow automatically appears on the board **after every move**, showing the recommended next direction. Great for beginners or when you are stuck.

---

## Daily Challenge

Every day a new challenge unlocks:

1. From the main menu, find the **Daily Challenge** card
2. Read the **target score** and **theme name**
3. Click **Play Daily** to start
4. The board starts with 6 tiles already placed — these are the same for everyone today
5. Reach the target score before the game ends to mark it as **Completed**

Click **History** to see all the daily challenges you have completed.

> Daily challenges reset at midnight. You can only complete each day's challenge once.

---

## Leaderboard

The leaderboard on the main menu tracks your **top 6 scores** for each game mode. Use the dropdown to switch between modes.

Scores are saved automatically when a game ends (win or lose). The leaderboard is stored on your device only — scores are not shared online.

---

## Achievements

There are **6 badges** to unlock. Your progress is shown in the **Achievements** section on the main menu.

| Badge | How to unlock |
|-------|--------------|
| First Pulse | Merge any two tiles |
| Crystal Bloom | Create a 512 tile |
| Aurora Sage | Reach the legendary 2048 tile |
| Flux Maestro | Score 8,000 points in a single game |
| Chrono Voyager | Complete 5 daily challenges |
| Streak Weaver | Win 3 games in a row |

When you unlock a badge mid-game, a notification appears in the corner.

---

## Settings

Access settings from the main menu. Click **Save** to apply changes.

| Setting | What it does |
|---------|-------------|
| **Animation Speed** | Controls how fast tiles slide (Slow / Normal / Fast) |
| **Sound & Ambient** | Turns the background music on or off |
| **Show Grid Lines** | Shows or hides the lines between grid cells |
| **Theme** | Changes the colour scheme (Cold, Warm, Dark) |
| **Power-Ups** | Enables or disables Void Pulse, Flux Surge, and Time Stitch (Undo) |

### Themes

| Name | Look |
|------|------|
| Cold (default) | Royal Blue tones — cool and crisp |
| Warm | Sunset orange and amber tones |
| Dark | Deep night sky, easier on the eyes |

---

## Frequently Asked Questions

**Q: My progress is gone after clearing my browser data. Why?**
A: All scores, achievements, and settings are stored in your browser's local storage. If you clear cookies or site data, everything resets. There is no cloud sync.

**Q: Can I play on my phone?**
A: Yes. Swipe in any direction to move tiles. All buttons are touch-friendly.

**Q: The sound isn't working.**
A: Browsers require you to interact with the page before playing audio. Try tapping any button first. Also check that **Sound & Ambient** is enabled in Settings.

**Q: Why does the game keep going after I reach 2048?**
A: In Classic mode, you can click **Keep Going** after winning to continue playing. In Endless mode, there is no win condition at all.

**Q: I used all my undos — can I get more?**
A: No. Each game gives you a maximum of 3 undos. Starting a new game resets the count.

**Q: What does the Assist mode do exactly?**
A: After every move, the game calculates all possible directions and shows an arrow pointing to the one most likely to increase your score and keep the board open. It is a suggestion, not a guarantee.

**Q: The daily challenge says "Completed" — when does it reset?**
A: Daily challenges reset at midnight in your local time. A new board and target appear each day.

**Q: Can I share my score with friends?**
A: Not directly — there is no online leaderboard. You can use the **Export Replay** or **Copy Replay** buttons on the game screen to share your move history as a JSON file.
