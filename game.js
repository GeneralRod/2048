// Enhanced 2048 game with replay + audio + accessibility polish
const ANIMATION_SPEEDS = {
    slow: 0.48,
    normal: 0.32,
    fast: 0.18
};

const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

const deepCloneGrid = (grid) => grid.map(row => [...row]);

class AmbientSoundtrack {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.audioCtx = null;
        this.voices = [];
        this.suspended = false;
    }

    setEnabled(flag) {
        this.enabled = flag;
        if (flag) {
            this.start();
        } else {
            this.stop();
        }
    }

    start() {
        if (!this.enabled || this.isPlaying()) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.audioCtx = new AudioContext();
        const base = 174; // Hz, calming pad
        [1, 1.25, 1.5].forEach((ratio, index) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            gain.gain.value = 0.018 + index * 0.004;
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

        this.settings = this.loadSettings();
        this.replay = new ReplayManager(() => ({grid: this.grid, score: this.score}));
        this.soundtrack = new AmbientSoundtrack(this.settings.soundEffects !== false);

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
            soundEffects: true,
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
        this.settings.soundEffects !== false ? this.soundtrack.start() : this.soundtrack.stop();
    }

    initGame() {
        const params = new URLSearchParams(window.location.search);
        this.currentMode = params.get('mode') || 'classic';
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
        this.tileContainer.innerHTML = '';
        this.currentMode = mode;

        this.applySettings();
        this.setupMode(mode);
        this.replay.reset();
        this.updateScore();
        this.addRandomTile();
        this.addRandomTile();
        this.renderBoard();
        this.hideMessage();
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
    }

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
        this.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateMovesDisplay() {
        if (!this.movesDisplay) return;
        this.movesDisplay.textContent = `Moves: ${this.movesLeft}`;
    }

    setupEventListeners() {
        const handleMoveResult = (direction, moved) => {
            if (!moved) return;
            this.addRandomTile();
            this.renderBoard();
            this.updateScore();
            this.replay.captureSnapshot(direction, this.previousGrid);
            this.checkGameStatus();
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
            if (!MOVE_KEYS.includes(event.key) || (this.over && !this.won)) return;
            event.preventDefault();
            const moved = this.move(this.keyToDirection(event.key));
            handleMoveResult(this.keyToDirection(event.key), moved);
        });

        let touchStartX = 0;
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, {passive: true});

        document.addEventListener('touchend', (e) => {
            if (this.over && !this.won) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (Math.max(absDx, absDy) < 30) return;
            const direction = absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            const moved = this.move(direction);
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

    persistLeaderboard() {
        if (this.leaderboardLogged || typeof leaderboardManager === 'undefined') return;
        leaderboardManager.addEntry(this.currentMode, this.score);
        window.dispatchEvent(new CustomEvent('leaderboardUpdated', {detail: {mode: this.currentMode}}));
        this.leaderboardLogged = true;
    }

    showMessage(text, className) {
        this.messageContainer.querySelector('p').textContent = text;
        this.messageContainer.className = `game-message ${className}`;
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