// Game 2048 Class - Completely rewritten with proper logic
const ANIMATION_SPEEDS = {
    slow: 0.48,
    normal: 0.32,
    fast: 0.18
};

class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.best = parseInt(localStorage.getItem('best2048'), 10) || 0;
        this.tileContainer = document.getElementById('tile-container');
        this.scoreElement = document.getElementById('score');
        this.bestElement = document.getElementById('best');
        this.scoreBox = this.scoreElement.closest('.score-box');
        this.bestBox = this.bestElement.closest('.score-box');
        this.messageContainer = document.getElementById('game-message');
        this.gameContainer = document.querySelector('.game-container');
        this.currentMode = 'classic';
        this.timer = null;
        this.timeLeft = 0;
        this.movesLeft = 0;
        this.mergeCells = new Set();
        this.settings = this.loadSettings();
        this.applySettings();
        this.setupEventListeners();
        this.initGame();
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
    }
    
    initGame() {
        const params = new URLSearchParams(window.location.search);
        this.currentMode = params.get('mode') || 'classic';
        const modeDisplay = document.getElementById('current-mode');
        if (modeDisplay) {
            modeDisplay.textContent = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
        }
        this.startNewGame(this.currentMode);
    }
    
    startNewGame(mode) {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.won = false;
        this.over = false;
        this.mergeCells.clear();
        this.tileContainer.innerHTML = '';
        this.currentMode = mode;
        this.applySettings();
        this.setupMode(mode);
        this.updateScore();
        this.addRandomTile();
        this.addRandomTile();
        this.renderBoard();
        this.hideMessage();
    }
    
    setupMode(mode) {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const timerDisplay = document.getElementById('timer');
        const movesDisplay = document.getElementById('moves');
        if (timerDisplay) timerDisplay.style.display = 'none';
        if (movesDisplay) movesDisplay.style.display = 'none';

        switch (mode) {
            case 'timed':
                this.timeLeft = 300;
                if (timerDisplay) timerDisplay.style.display = 'block';
                this.updateTimerDisplay();
                this.startTimer();
                break;
            case 'limited':
                this.movesLeft = 100;
                if (movesDisplay) movesDisplay.style.display = 'block';
                this.updateMovesDisplay();
                break;
            default:
                this.timeLeft = 0;
                this.movesLeft = 0;
                break;
        }
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.over = true;
                this.showMessage('Time\'s up!', 'game-over');
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timer');
        if (!timerDisplay) return;
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateMovesDisplay() {
        const movesDisplay = document.getElementById('moves');
        if (!movesDisplay) return;
        movesDisplay.textContent = `Moves: ${this.movesLeft}`;
    }
    
    setupEventListeners() {
        const handleInput = (moved) => {
            if (!moved) return;
            this.addRandomTile();
            this.renderBoard();
            this.updateScore();
            this.checkGameStatus();
            if (this.currentMode === 'limited') {
                this.movesLeft--;
                this.updateMovesDisplay();
                if (this.movesLeft <= 0) {
                    this.over = true;
                    this.showMessage('No moves left!', 'game-over');
                }
            }
        };

        document.addEventListener('keydown', (e) => {
            if (this.over && !this.won) return;
            let moved = false;
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    moved = this.move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moved = this.move('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    moved = this.move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    moved = this.move('right');
                    break;
            }
            handleInput(moved);
        });

        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, {passive: true});

        document.addEventListener('touchend', (e) => {
            if (this.over && !this.won) return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            let moved = false;
            if (Math.max(absDx, absDy) > 30) {
                if (absDx > absDy) {
                    moved = this.move(dx > 0 ? 'right' : 'left');
                } else {
                    moved = this.move(dy > 0 ? 'down' : 'up');
                }
                handleInput(moved);
            }
        });
    }
    
    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({row, col});
                }
            }
        }
        if (emptyCells.length === 0) return;
        const random = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.grid[random.row][random.col] = Math.random() < 0.9 ? 2 : 4;
    }
    
    move(direction) {
        const previousGrid = this.grid.map(row => [...row]);
        this.mergeCells.clear();
        let moved = false;
        if (direction === 'left' || direction === 'right') {
            const reverse = direction === 'right';
            for (let row = 0; row < this.size; row++) {
                const line = this.grid[row];
                const {line: mergedLine, gain, mergeIndices} = this.processLine(line, reverse);
                this.score += gain;
                if (!this.linesEqual(line, mergedLine)) {
                    moved = true;
                    this.grid[row] = mergedLine;
                }
                const actualIndices = mergeIndices.map(idx => idx);
                actualIndices.forEach(col => this.mergeCells.add(`${row}-${col}`));
            }
        } else {
            const reverse = direction === 'down';
            for (let col = 0; col < this.size; col++) {
                const line = this.grid.map(row => row[col]);
                const {line: mergedLine, gain, mergeIndices} = this.processLine(line, reverse);
                this.score += gain;
                if (!this.linesEqual(line, mergedLine)) {
                    moved = true;
                    mergedLine.forEach((value, row) => {
                        this.grid[row][col] = value;
                    });
                }
                mergeIndices.forEach(row => this.mergeCells.add(`${row}-${col}`));
            }
        }
        return moved;
    }
    
    processLine(line, reverse = false) {
        const working = reverse ? [...line].reverse() : [...line];
        const compressed = working.filter(val => val !== 0);
        const result = [];
        const mergeIndices = [];
        let scoreGain = 0;
        let i = 0;
        while (i < compressed.length) {
            if (compressed[i] === compressed[i + 1]) {
                const value = compressed[i] * 2;
                result.push(value);
                mergeIndices.push(result.length - 1);
                scoreGain += value;
                i += 2;
            } else {
                result.push(compressed[i]);
                i += 1;
            }
        }
        while (result.length < this.size) {
            result.push(0);
        }
        const finalLine = reverse ? result.reverse() : result;
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
                if (value > 0) {
                    const tile = this.createTile(value, row, col);
                    if (this.mergeCells.has(`${row}-${col}`)) {
                        tile.classList.add('tile-merge');
                        setTimeout(() => tile.classList.remove('tile-merge'), 400);
                    }
                    this.tileContainer.appendChild(tile);
                }
            }
        }
    }
    
    createTile(value, row, col) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        if (value > 2048) tile.classList.add('tile-super');
        tile.textContent = value;
        tile.style.left = `${col * 122}px`;
        tile.style.top = `${row * 122}px`;
        tile.classList.add('tile-appear');
        tile.addEventListener('animationend', () => tile.classList.remove('tile-appear'), {once: true});
        return tile;
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
    
    flashElement(element, animationClass) {
        if (!element) return;
        element.classList.add(animationClass);
        setTimeout(() => element.classList.remove(animationClass), 400);
    }
    
    checkGameStatus() {
        if (!this.won && this.currentMode !== 'endless') {
            if (this.grid.some(row => row.includes(2048))) {
                this.won = true;
                this.showMessage('You win!', 'game-won');
                return;
            }
        }
        if (this.isGameOver()) {
            this.over = true;
            this.showMessage('Game over!', 'game-over');
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

// Navigation functions
function goToMenu() {
    window.location.href = 'menu.html';
}

// Initialize the game
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});