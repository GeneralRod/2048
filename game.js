/**
 * @file game.js
 * Core game engine for the 2048 web game.
 * Exports: Game2048 (via window.game), ReplayManager, AmbientSoundtrack.
 * Depends on shared.js being loaded first (provides readJson, leaderboardManager, etc.).
 */

// Enhanced 2048 game with replay + audio + accessibility polish
const ANIMATION_SPEEDS = {
    slow: 0.48,
    normal: 0.32,
    fast: 0.18
};

const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

const deepCloneGrid = (grid) => grid.map(row => [...row]);

const DIRECTION_ARROWS = {left: '←', right: '→', up: '↑', down: '↓'};
const MAX_UNDOS = 3;

class AmbientSoundtrack {
    constructor(enabled = false) {
        this.enabled = enabled;
        this.audioCtx = null;
        this.voices = [];
        this.volume = 0.45;
    }

    setEnabled(flag) {
        this.enabled = flag;
        if (flag) {
            this.start();
        } else {
            this.stop();
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        this.voices.forEach(({gain}) => {
            if (gain) gain.gain.value = this.volume * 0.055;
        });
    }

    start() {
        if (!this.enabled || this.isPlaying()) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.audioCtx = new AudioContext();
        const base = 174;
        [1, 1.25, 1.5].forEach((ratio, index) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(
                this.volume * (0.018 + index * 0.004),
                this.audioCtx.currentTime + 2
            );
            osc.type = index === 0 ? 'sine' : 'triangle';
            osc.frequency.value = base * ratio;
            osc.connect(gain).connect(this.audioCtx.destination);
            osc.start();
            this.voices.push({osc, gain});
        });
    }

    stop() {
        this.voices.forEach(({osc, gain}) => {
            try {
                gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1);
                osc.stop(this.audioCtx.currentTime + 1);
            } catch (_) {}
        });
        this.voices = [];
        if (this.audioCtx) {
            this.audioCtx.close();
            this.audioCtx = null;
        }
    }

    isPlaying() {
        return this.voices.length > 0;
    }
}

class ReplayManager {
    constructor(getState) {
        this.getState = getState;
        this.history = [];
        this.startTime = Date.now();
    }

    reset() {
        this.history = [];
        this.startTime = Date.now();
        this.captureSnapshot('start', null);
    }

    captureSnapshot(direction, beforeGrid) {
        const {grid, score} = this.getState();
        this.history.push({
            direction,
            before: beforeGrid ? deepCloneGrid(beforeGrid) : null,
            after: deepCloneGrid(grid),
            score,
            timestamp: Date.now() - this.startTime
        });
    }

    buildPayload(meta = {}) {
        return {
            version: 1,
            generatedAt: new Date().toISOString(),
            settings: meta.settings,
            mode: meta.mode,
            durationMs: Date.now() - this.startTime,
            moves: this.history
        };
    }

    async copy(meta) {
        const payload = this.buildPayload(meta);
        const text = JSON.stringify(payload, null, 2);
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
        }
    }

    export(meta) {
        const payload = this.buildPayload(meta);
        const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `2048-replay-${meta.mode}-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.best = parseInt(localStorage.getItem('best2048'), 10) || 0;
        this.currentMode = 'classic';
        this.timer = null;
        this.timeLeft = 0;
        this.movesLeft = 0;
        this.mergeCells = new Set();
        this.leaderboardLogged = false;
        this.dailyChallenge = null;
        this.undoStack = [];
        this.assistEnabled = false;

        // DOM references
        this.tileContainer = document.getElementById('tile-container');
        this.scoreElement = document.getElementById('score');
        this.bestElement = document.getElementById('best');
        this.scoreBox = this.scoreElement.closest('.score-box');
        this.bestBox = this.bestElement.closest('.score-box');
        this.messageContainer = document.getElementById('game-message');
        this.gameContainer = document.querySelector('.game-container');
        this.modeDisplay = document.getElementById('current-mode');
        this.timerDisplay = document.getElementById('timer');
        this.movesDisplay = document.getElementById('moves');
        this.replayToast = document.getElementById('replay-toast');
        this.tutorialOverlay = document.getElementById('tutorial-overlay');
        this.tutorialToggle = document.getElementById('tutorial-toggle');
        this.tutorialDismiss = document.getElementById('tutorial-dismiss');
        this.tutorialSkip = document.getElementById('tutorial-skip');
        this.exportButton = document.getElementById('export-replay');
        this.copyButton = document.getElementById('copy-replay');
        this.hintButton = document.getElementById('hint-button');
        this.undoButton = document.getElementById('undo-button');
        this.assistToggle = document.getElementById('assist-toggle');
        this.hintIndicator = document.getElementById('hint-indicator');

        // Show stored best immediately on page load
        this.bestElement.textContent = this.best;

        this.settings = this.loadSettings();
        this.replay = new ReplayManager(() => ({grid: this.grid, score: this.score}));
        this.soundtrack = new AmbientSoundtrack(false);

        this.applySettings();
        this.setupEventListeners();
        this.initGame();
        this.setupUIControls();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.soundtrack.stop();
            } else if (this.settings.soundEffects !== false) {
                this.soundtrack.start();
            }
        });
    }

    loadSettings() {
        const saved = localStorage.getItem('game2048-settings');
        return saved ? JSON.parse(saved) : {
            animationSpeed: 'normal',
            soundEffects: false,
            gridLines: true,
            theme: 'cold'
        };
    }

    applySettings() {
        document.documentElement.dataset.theme = this.settings.theme || 'cold';
        if (this.gameContainer) {
            this.gameContainer.classList.toggle('grid-lines', !!this.settings.gridLines);
        }
        const speedValue = ANIMATION_SPEEDS[this.settings.animationSpeed] || ANIMATION_SPEEDS.normal;
        document.documentElement.style.setProperty('--tile-transition', `${speedValue}s`);
        document.documentElement.style.setProperty('--tile-appear', `${Math.max(speedValue * 0.6, 0.18)}s`);
        const vol = typeof this.settings.ambientVolume === 'number' ? this.settings.ambientVolume : 0.45;
        this.soundtrack.setVolume(vol);
        if (this.settings.soundEffects) {
            this.soundtrack.start();
        } else {
            this.soundtrack.stop();
        }
    }

    initGame() {
        const params = new URLSearchParams(window.location.search);
        this.currentMode = params.get('mode') || 'classic';
        if (this.currentMode === 'daily') {
            const activeChallenge = readJson('game2048-daily-active', null);
            if (activeChallenge) this.dailyChallenge = activeChallenge;
        }
        if (this.modeDisplay) {
            this.modeDisplay.textContent = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
        }
        this.startNewGame(this.currentMode);
    }

    startNewGame(mode) {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.won = false;
        this.over = false;
        this.movesLeft = 0;
        this.timeLeft = 0;
        this.mergeCells.clear();
        this.leaderboardLogged = false;
        this.undoStack = [];
        this.lastMilestone = 0;
        this.tileContainer.innerHTML = '';
        this.currentMode = mode;

        this.applySettings();
        this.setupMode(mode);
        this.replay.reset();
        this.updateScore();
        if (mode === 'daily' && this.dailyChallenge?.board) {
            this.grid = this.dailyChallenge.board.map(row => [...row]);
        } else {
            this.addRandomTile();
            this.addRandomTile();
        }
        this.renderBoard();
        this.hideMessage();
        this.updateUndoButton();
        this.clearHintIndicator();
        this.maybeShowTutorial();
    }

    setupMode(mode) {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.timerDisplay) this.timerDisplay.style.display = 'none';
        if (this.movesDisplay) this.movesDisplay.style.display = 'none';

        switch (mode) {
            case 'timed':
                this.timeLeft = 300;
                if (this.timerDisplay) {
                    this.timerDisplay.style.display = 'block';
                    this.updateTimerDisplay();
                }
                this.startTimer();
                break;
            case 'limited':
                this.movesLeft = 100;
                if (this.movesDisplay) {
                    this.movesDisplay.style.display = 'block';
                    this.updateMovesDisplay();
                }
                break;
            case 'daily': {
                const targetDisplay = document.getElementById('daily-target-display');
                if (targetDisplay && this.dailyChallenge) {
                    targetDisplay.style.display = 'block';
                    targetDisplay.textContent = `Target: ${this.dailyChallenge.targetScore}`;
                }
                break;
            }
            case 'endless':
            case 'classic':
            default:
                break;
        }
    }

    setupUIControls() {
        if (this.tutorialToggle) {
            this.tutorialToggle.addEventListener('click', () => this.showTutorial());
        }
        if (this.tutorialDismiss) {
            this.tutorialDismiss.addEventListener('click', () => this.dismissTutorial());
        }
        if (this.tutorialSkip) {
            this.tutorialSkip.addEventListener('click', () => this.hideTutorial());
        }
        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => {
                this.replay.export(this.getReplayMeta());
                this.showToast('Replay downloaded');
            });
        }
        if (this.copyButton) {
            this.copyButton.addEventListener('click', async () => {
                await this.replay.copy(this.getReplayMeta());
                this.showToast('Replay copied to clipboard');
            });
        }
        if (this.hintButton) {
            this.hintButton.addEventListener('click', () => this.showHint());
        }
        if (this.undoButton) {
            this.undoButton.addEventListener('click', () => this.undo());
        }
        if (this.assistToggle) {
            this.assistToggle.addEventListener('click', () => this.toggleAssist());
        }
    }

    // ── Undo ──────────────────────────────────────────────────────────────────

    saveUndoState() {
        const undoEnabled = this.settings.powerups?.undo !== false;
        if (!undoEnabled) return;
        this.undoStack.push({grid: deepCloneGrid(this.grid), score: this.score});
        if (this.undoStack.length > MAX_UNDOS) this.undoStack.shift();
    }

    undo() {
        if (this.over || !this.undoStack.length) return;
        const state = this.undoStack.pop();
        this.grid = state.grid;
        this.score = state.score;
        this.mergeCells.clear();
        this.renderBoard();
        this.updateScore();
        this.updateUndoButton();
        this.clearHintIndicator();
        this.showToast('Undone');
    }

    updateUndoButton() {
        if (!this.undoButton) return;
        const undoEnabled = this.settings.powerups?.undo !== false;
        const remaining = undoEnabled ? this.undoStack.length : 0;
        this.undoButton.textContent = `Undo (${remaining})`;
        this.undoButton.disabled = remaining === 0;
    }

    // ── Hint / Assist ─────────────────────────────────────────────────────────

    /**
     * Pure simulation of a move on an arbitrary grid — does NOT mutate game state.
     * Used by getBestMove() to score candidate directions.
     * @param {number[][]} grid
     * @param {'left'|'right'|'up'|'down'} direction
     * @returns {{ moved: boolean, gain: number, empty: number, grid: number[][] }}
     */
    simulateDirection(grid, direction) {
        const size = this.size;
        let totalGain = 0;
        let moved = false;
        const newGrid = deepCloneGrid(grid);
        const reverse = direction === 'right' || direction === 'down';

        const processLine = (line) => {
            const working = reverse ? [...line].reverse() : [...line];
            const filtered = working.filter(v => v !== 0);
            const merged = [];
            let gain = 0;
            let i = 0;
            while (i < filtered.length) {
                if (filtered[i] === filtered[i + 1]) {
                    const val = filtered[i] * 2;
                    merged.push(val);
                    gain += val;
                    i += 2;
                } else {
                    merged.push(filtered[i]);
                    i++;
                }
            }
            while (merged.length < size) merged.push(0);
            return {line: reverse ? merged.reverse() : merged, gain};
        };

        if (direction === 'left' || direction === 'right') {
            for (let r = 0; r < size; r++) {
                const {line, gain} = processLine(newGrid[r]);
                if (!line.every((v, i) => v === newGrid[r][i])) moved = true;
                newGrid[r] = line;
                totalGain += gain;
            }
        } else {
            for (let c = 0; c < size; c++) {
                const col = newGrid.map(row => row[c]);
                const {line, gain} = processLine(col);
                if (!line.every((v, i) => v === col[i])) moved = true;
                line.forEach((val, r) => { newGrid[r][c] = val; });
                totalGain += gain;
            }
        }

        const emptyAfter = newGrid.flat().filter(v => v === 0).length;
        return {moved, gain: totalGain, empty: emptyAfter, grid: newGrid};
    }

    /**
     * Evaluates all four directions and returns the one with the highest
     * heuristic score: (scoreGain × 2) + (emptyCells × 10).
     * @returns {'left'|'right'|'up'|'down'|null} best direction, or null if no move is possible
     */
    getBestMove() {
        const directions = ['left', 'right', 'up', 'down'];
        let bestDir = null;
        let bestScore = -1;
        for (const dir of directions) {
            const {moved, gain, empty} = this.simulateDirection(this.grid, dir);
            if (!moved) continue;
            // Weight: score gain matters most, open cells are a bonus
            const value = gain * 2 + empty * 10;
            if (value > bestScore) {
                bestScore = value;
                bestDir = dir;
            }
        }
        return bestDir;
    }

    showHint() {
        if (this.over) return;
        const dir = this.getBestMove();
        if (!dir) return;
        const arrow = DIRECTION_ARROWS[dir];
        this.showToast(`Hint: ${arrow} ${dir.charAt(0).toUpperCase() + dir.slice(1)}`);
        this.setHintIndicator(dir);
    }

    setHintIndicator(direction) {
        if (!this.hintIndicator) return;
        this.hintIndicator.dataset.direction = direction;
        this.hintIndicator.textContent = DIRECTION_ARROWS[direction];
        this.hintIndicator.classList.remove('hidden');
        clearTimeout(this.hintTimeout);
        this.hintTimeout = setTimeout(() => this.clearHintIndicator(), 2500);
    }

    clearHintIndicator() {
        if (!this.hintIndicator) return;
        this.hintIndicator.classList.add('hidden');
        delete this.hintIndicator.dataset.direction;
    }

    toggleAssist() {
        this.assistEnabled = !this.assistEnabled;
        if (this.assistToggle) {
            this.assistToggle.textContent = `Assist: ${this.assistEnabled ? 'On' : 'Off'}`;
            this.assistToggle.classList.toggle('active', this.assistEnabled);
        }
        if (!this.assistEnabled) this.clearHintIndicator();
    }

    // ── Milestones ────────────────────────────────────────────────────────────

    checkMilestone() {
        const milestones = [500, 1000, 2000, 5000, 10000, 20000, 50000];
        for (const m of milestones) {
            if (this.score >= m && m > this.lastMilestone) {
                this.lastMilestone = m;
                this.showToast(`Score milestone: ${m.toLocaleString()}`);
            }
        }
    }

    // ── Keep Going ────────────────────────────────────────────────────────────

    keepGoing() {
        this.hideMessage();
    }

    // ── Achievements ──────────────────────────────────────────────────────────

    evaluateAchievements() {
        if (typeof achievementManager === 'undefined') return;
        const highestTile = Math.max(...this.grid.flat());
        const dailyData = readJson('game2048-daily', {completed: []});
        const winStreak = parseInt(localStorage.getItem('game2048-win-streak') || '0', 10);
        const newlyUnlocked = achievementManager.evaluate({
            highestTile,
            score: this.score,
            dailyCompleted: dailyData.completed?.length || 0,
            winStreak
        });
        newlyUnlocked.forEach(ach => this.showToast(`Achievement: ${ach.title}`));
    }

    // ── Core game methods ─────────────────────────────────────────────────────

    maybeShowTutorial() {
        const dismissed = localStorage.getItem('game2048-tutorial-dismissed') === '1';
        if (!dismissed) {
            this.showTutorial();
        }
    }

    showTutorial() {
        if (this.tutorialOverlay) {
            this.tutorialOverlay.classList.remove('hidden');
        }
    }

    hideTutorial() {
        if (this.tutorialOverlay) {
            this.tutorialOverlay.classList.add('hidden');
        }
    }

    dismissTutorial() {
        localStorage.setItem('game2048-tutorial-dismissed', '1');
        this.hideTutorial();
    }

    showToast(message) {
        if (!this.replayToast) return;
        this.replayToast.textContent = message;
        this.replayToast.classList.remove('hidden');
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => this.replayToast.classList.add('hidden'), 1800);
    }

    getReplayMeta() {
        return {
            mode: this.currentMode,
            settings: this.settings,
            score: this.score
        };
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.over = true;
                this.showMessage('Time\'s up!', 'game-over');
                this.persistLeaderboard();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        if (!this.timerDisplay) return;
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const text = document.getElementById('timer-text');
        const bar  = document.getElementById('timer-bar');
        const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (text) {
            text.textContent = formatted;
        } else {
            this.timerDisplay.textContent = formatted;
        }
        if (bar) {
            const pct = (this.timeLeft / 300) * 100;
            bar.style.width = `${pct}%`;
            bar.classList.toggle('danger', this.timeLeft <= 60);
        }
    }

    updateMovesDisplay() {
        if (!this.movesDisplay) return;
        const text = document.getElementById('moves-text');
        const bar  = document.getElementById('moves-bar');
        if (text) {
            text.textContent = `Moves: ${this.movesLeft}`;
        } else {
            this.movesDisplay.textContent = `Moves: ${this.movesLeft}`;
        }
        if (bar) {
            const pct = (this.movesLeft / 100) * 100;
            bar.style.width = `${pct}%`;
            bar.classList.toggle('danger', this.movesLeft <= 20);
        }
    }

    setupEventListeners() {
        const handleMoveResult = (direction, moved) => {
            if (!moved) return;
            this.addRandomTile();
            this.renderBoard();
            this.updateScore();
            this.replay.captureSnapshot(direction, this.previousGrid);
            this.checkGameStatus();
            this.checkMilestone();
            this.evaluateAchievements();
            this.updateUndoButton();
            if (this.assistEnabled && !this.over) {
                const best = this.getBestMove();
                if (best) this.setHintIndicator(best);
            } else {
                this.clearHintIndicator();
            }
            if (this.currentMode === 'limited') {
                this.movesLeft--;
                this.updateMovesDisplay();
                if (this.movesLeft <= 0) {
                    this.over = true;
                    this.showMessage('No moves left!', 'game-over');
                    this.persistLeaderboard();
                }
            }
        };

        document.addEventListener('keydown', (event) => {
            // Ctrl+Z / Cmd+Z → undo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault();
                this.undo();
                return;
            }
            // H → hint
            if (event.key === 'h' || event.key === 'H') {
                this.showHint();
                return;
            }
            if (!MOVE_KEYS.includes(event.key) || this.over) return;
            event.preventDefault();
            this.saveUndoState();
            const moved = this.move(this.keyToDirection(event.key));
            // If the move didn't change anything, reclaim the undo slot
            if (!moved) this.undoStack.pop();
            handleMoveResult(this.keyToDirection(event.key), moved);
        });

        let touchStartX = 0;
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, {passive: true});

        document.addEventListener('touchend', (e) => {
            if (this.over) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (Math.max(absDx, absDy) < 30) return;
            const direction = absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            this.saveUndoState();
            const moved = this.move(direction);
            if (!moved) this.undoStack.pop();
            handleMoveResult(direction, moved);
        });
    }

    keyToDirection(key) {
        switch (key) {
            case 'ArrowUp': return 'up';
            case 'ArrowDown': return 'down';
            case 'ArrowLeft': return 'left';
            case 'ArrowRight': return 'right';
            default: return '';
        }
    }

    addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) emptyCells.push({r, c});
            }
        }
        if (!emptyCells.length) return;
        const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.grid[chosen.r][chosen.c] = Math.random() < 0.9 ? 2 : 4;
    }

    /**
     * Applies a move to the board in the given direction.
     * Saves the current grid to this.previousGrid before mutating.
     * @param {'left'|'right'|'up'|'down'} direction
     * @returns {boolean} true if any tile moved or merged
     */
    move(direction) {
        this.previousGrid = deepCloneGrid(this.grid);
        this.mergeCells.clear();
        let moved = false;

        const iterate = (getter, setter) => {
            for (let i = 0; i < this.size; i++) {
                const line = getter(i);
                const {line: merged, gain, mergeIndices} = this.processLine(line, direction === 'right' || direction === 'down');
                this.score += gain;
                if (!this.linesEqual(line, merged)) {
                    moved = true;
                    setter(i, merged);
                }
                mergeIndices.forEach(idx => {
                    if (direction === 'left' || direction === 'right') {
                        this.mergeCells.add(`${i}-${idx}`);
                    } else {
                        this.mergeCells.add(`${idx}-${i}`);
                    }
                });
            }
        };

        if (direction === 'left' || direction === 'right') {
            iterate(
                (row) => this.grid[row],
                (row, newRow) => { this.grid[row] = newRow; }
            );
        } else {
            iterate(
                (col) => this.grid.map(row => row[col]),
                (col, newCol) => newCol.forEach((value, row) => { this.grid[row][col] = value; })
            );
        }
        return moved;
    }

    /**
     * Core merge algorithm for a single row or column.
     * Filters zeroes, merges adjacent equal values left-to-right (once per cell),
     * then pads with trailing zeroes. When reverse=true the line is flipped
     * before and after processing to handle right/down slides.
     * @param {number[]} line  - Array of 4 tile values (0 = empty)
     * @param {boolean}  reverse - true for right/down directions
     * @returns {{ line: number[], gain: number, mergeIndices: number[] }}
     */
    processLine(line, reverse = false) {
        const working = reverse ? [...line].reverse() : [...line];
        const filtered = working.filter(value => value !== 0);
        const merged = [];
        const mergeIndices = [];
        let scoreGain = 0;
        let i = 0;
        while (i < filtered.length) {
            if (filtered[i] === filtered[i + 1]) {
                const value = filtered[i] * 2;
                merged.push(value);
                mergeIndices.push(merged.length - 1);
                scoreGain += value;
                i += 2;
            } else {
                merged.push(filtered[i]);
                i += 1;
            }
        }
        while (merged.length < this.size) merged.push(0);
        const finalLine = reverse ? merged.reverse() : merged;
        const mappedIndices = mergeIndices.map(idx => reverse ? (this.size - 1 - idx) : idx);
        return {line: finalLine, gain: scoreGain, mergeIndices: mappedIndices};
    }

    linesEqual(a, b) {
        return a.every((value, index) => value === b[index]);
    }

    renderBoard() {
        if (!this.tileContainer) return;
        this.tileContainer.innerHTML = '';
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.grid[row][col];
                if (!value) continue;
                const tile = document.createElement('div');
                tile.className = `tile tile-${value}`;
                if (value > 2048) tile.classList.add('tile-super');
                tile.textContent = value;
                tile.style.left = `${col * 122}px`;
                tile.style.top = `${row * 122}px`;
                if (this.mergeCells.has(`${row}-${col}`)) tile.classList.add('tile-merge');
                tile.addEventListener('animationend', () => tile.classList.remove('tile-merge'), {once: true});
                this.tileContainer.appendChild(tile);
            }
        }
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.flashElement(this.scoreBox, 'score-pulse');
        if (this.score > this.best) {
            this.best = this.score;
            this.bestElement.textContent = this.best;
            localStorage.setItem('best2048', this.best);
            this.flashElement(this.bestBox, 'best-pulse');
        }
    }

    flashElement(element, className) {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => element.classList.remove(className), 400);
    }

    checkGameStatus() {
        if (!this.won && this.currentMode !== 'endless') {
            if (this.grid.some(row => row.includes(2048))) {
                this.won = true;
                this.showMessage('You win!', 'game-won');
                this.persistLeaderboard();
                return;
            }
        }
        if (this.isGameOver()) {
            this.over = true;
            this.showMessage('Game over!', 'game-over');
            this.persistLeaderboard();
        }
    }

    isGameOver() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) return false;
                if (col < this.size - 1 && this.grid[row][col] === this.grid[row][col + 1]) return false;
                if (row < this.size - 1 && this.grid[row][col] === this.grid[row + 1][col]) return false;
            }
        }
        return true;
    }

    /**
     * Persists the current score to the leaderboard (once per game).
     * Also handles daily challenge completion and win-streak tracking.
     * Guarded by this.leaderboardLogged to prevent double-submission.
     */
    persistLeaderboard() {
        if (this.leaderboardLogged || typeof leaderboardManager === 'undefined') return;
        leaderboardManager.addEntry(this.currentMode, this.score);
        window.dispatchEvent(new CustomEvent('leaderboardUpdated', {detail: {mode: this.currentMode}}));
        if (this.currentMode === 'daily' && this.dailyChallenge &&
                this.score >= this.dailyChallenge.targetScore) {
            dailyChallengeManager.markCompleted(this.dailyChallenge.date);
        }
        // Update win streak
        const streak = parseInt(localStorage.getItem('game2048-win-streak') || '0', 10);
        localStorage.setItem('game2048-win-streak', this.won ? streak + 1 : 0);
        this.leaderboardLogged = true;
    }

    showMessage(text, className) {
        this.messageContainer.querySelector('p').textContent = text;
        this.messageContainer.className = `game-message ${className}`;
        const keepGoingBtn = this.messageContainer.querySelector('.keep-going-button');
        if (keepGoingBtn) keepGoingBtn.style.display = this.won ? 'inline-block' : 'none';
    }

    hideMessage() {
        this.messageContainer.className = 'game-message';
    }

    restart() {
        this.startNewGame(this.currentMode);
    }
}

function goToMenu() {
    window.location.href = 'menu.html';
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});
