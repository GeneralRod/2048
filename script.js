// Game Manager - Handles screens and navigation
class GameManager {
    constructor() {
        this.currentScreen = 'title';
        this.currentGameMode = 'classic';
        this.settings = {
            animationSpeed: 'normal',
            soundEffects: true,
            gridLines: true,
            theme: 'cold'
        };
        this.game = null;
        this.loadSettings();
        this.showTitle();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('game2048-settings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }
    
    saveSettings() {
        this.settings.animationSpeed = document.getElementById('animation-speed').value;
        this.settings.soundEffects = document.getElementById('sound-effects').checked;
        this.settings.gridLines = document.getElementById('grid-lines').checked;
        this.settings.theme = document.getElementById('theme').value;
        localStorage.setItem('game2048-settings', JSON.stringify(this.settings));
        this.showTitle();
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        setTimeout(() => {
            document.getElementById(screenId).classList.add('active');
            this.currentScreen = screenId;
        }, 50);
    }
    
    showTitle() {
        this.showScreen('title-screen');
    }
    
    showGame() {
        this.showScreen('game-screen');
        if (!this.game) {
            this.game = new Game2048(this.settings);
        }
        this.game.startNewGame(this.currentGameMode);
    }
    
    showSettings() {
        this.showScreen('settings-screen');
        // Load current settings into form
        document.getElementById('animation-speed').value = this.settings.animationSpeed;
        document.getElementById('sound-effects').checked = this.settings.soundEffects;
        document.getElementById('grid-lines').checked = this.settings.gridLines;
        document.getElementById('theme').value = this.settings.theme;
    }
    
    showGameModes() {
        this.showScreen('game-modes-screen');
    }
    
    startMode(mode) {
        this.currentGameMode = mode;
        document.getElementById('current-mode').textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        this.showGame();
    }
}

// Game 2048 Class - Completely rewritten with proper logic
class Game2048 {
    constructor(settings) {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.best = localStorage.getItem('best2048') || 0;
        this.tileContainer = document.getElementById('tile-container');
        this.scoreElement = document.getElementById('score');
        this.bestElement = document.getElementById('best');
        this.messageContainer = document.getElementById('game-message');
        this.won = false;
        this.over = false;
        this.tiles = new Map();
        this.tileId = 0;
        this.settings = settings;
        this.timer = null;
        this.moves = 100;
        this.setupEventListeners();
    }
    
    startNewGame(mode) {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.won = false;
        this.over = false;
        this.tiles.clear();
        this.tileId = 0;
        this.currentMode = mode;
        
        // Setup mode-specific settings
        this.setupMode(mode);
        
        this.updateScore();
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
        this.hideMessage();
    }
    
    setupMode(mode) {
        // Clear previous timers
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Hide all mode displays
        document.getElementById('timer').style.display = 'none';
        document.getElementById('moves').style.display = 'none';
        
        switch(mode) {
            case 'timed':
                this.timeLeft = 300; // 5 minutes
                document.getElementById('timer').style.display = 'block';
                this.startTimer();
                break;
            case 'limited':
                this.movesLeft = 100;
                document.getElementById('moves').style.display = 'block';
                this.updateMovesDisplay();
                break;
            case 'endless':
                // No special setup needed
                break;
            case 'classic':
            default:
                // Classic mode
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
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateMovesDisplay() {
        document.getElementById('moves').textContent = `Moves: ${this.movesLeft}`;
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.over && !this.won) return;
            
            let moved = false;
            switch(e.key) {
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
            
            if (moved) {
                this.addRandomTile();
                this.updateDisplay();
                this.checkGameStatus();
                
                // Handle limited moves mode
                if (this.currentMode === 'limited') {
                    this.movesLeft--;
                    this.updateMovesDisplay();
                    
                    if (this.movesLeft <= 0) {
                        this.over = true;
                        this.showMessage('No moves left!', 'game-over');
                    }
                }
            }
        });
        
        // Touch controls
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (this.over && !this.won) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            if (Math.max(absDx, absDy) > 30) {
                let moved = false;
                if (absDx > absDy) {
                    moved = this.move(dx > 0 ? 'right' : 'left');
                } else {
                    moved = this.move(dy > 0 ? 'down' : 'up');
                }
                
                if (moved) {
                    this.addRandomTile();
                    this.updateDisplay();
                    this.checkGameStatus();
                    
                    // Handle limited moves mode
                    if (this.currentMode === 'limited') {
                        this.movesLeft--;
                        this.updateMovesDisplay();
                        
                        if (this.movesLeft <= 0) {
                            this.over = true;
                            this.showMessage('No moves left!', 'game-over');
                        }
                    }
                }
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
        
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    move(direction) {
        const oldGrid = this.grid.map(row => [...row]);
        let moved = false;
        
        if (direction === 'left') {
            for (let row = 0; row < this.size; row++) {
                const newRow = this.slideAndMerge(this.grid[row]);
                this.grid[row] = newRow;
            }
        } else if (direction === 'right') {
            for (let row = 0; row < this.size; row++) {
                const newRow = this.slideAndMerge(this.grid[row].slice().reverse()).reverse();
                this.grid[row] = newRow;
            }
        } else if (direction === 'up') {
            for (let col = 0; col < this.size; col++) {
                const column = this.grid.map(row => row[col]);
                const newColumn = this.slideAndMerge(column);
                for (let row = 0; row < this.size; row++) {
                    this.grid[row][col] = newColumn[row];
                }
            }
        } else if (direction === 'down') {
            for (let col = 0; col < this.size; col++) {
                const column = this.grid.map(row => row[col]).reverse();
                const newColumn = this.slideAndMerge(column).reverse();
                for (let row = 0; row < this.size; row++) {
                    this.grid[row][col] = newColumn[row];
                }
            }
        }
        
        moved = !this.gridsEqual(oldGrid, this.grid);
        return moved;
    }
    
    slideAndMerge(arr) {
        let newArr = arr.filter(val => val !== 0);
        
        for (let i = 0; i < newArr.length - 1; i++) {
            if (newArr[i] === newArr[i + 1]) {
                newArr[i] *= 2;
                this.score += newArr[i];
                newArr.splice(i + 1, 1);
            }
        }
        
        while (newArr.length < this.size) {
            newArr.push(0);
        }
        
        return newArr;
    }
    
    gridsEqual(grid1, grid2) {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (grid1[row][col] !== grid2[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    updateDisplay() {
        this.tileContainer.innerHTML = '';
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${this.grid[row][col]}`;
                    if (this.grid[row][col] > 2048) {
                        tile.className = 'tile tile-super';
                    }
                    tile.textContent = this.grid[row][col];
                    tile.style.left = `${col * 122}px`;
                    tile.style.top = `${row * 122}px`;
                    this.tileContainer.appendChild(tile);
                }
            }
        }
        
        this.updateScore();
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        if (this.score > this.best) {
            this.best = this.score;
            this.bestElement.textContent = this.best;
            localStorage.setItem('best2048', this.best);
        } else {
            this.bestElement.textContent = this.best;
        }
    }
    
    checkGameStatus() {
        if (!this.won && this.currentMode !== 'endless') {
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (this.grid[row][col] === 2048) {
                        this.won = true;
                        this.showMessage('You win!', 'game-won');
                        return;
                    }
                }
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
                if (this.grid[row][col] === 0) {
                    return false;
                }
                
                if (col < this.size - 1 && this.grid[row][col] === this.grid[row][col + 1]) {
                    return false;
                }
                
                if (row < this.size - 1 && this.grid[row][col] === this.grid[row + 1][col]) {
                    return false;
                }
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

// Initialize the game manager
const gameManager = new GameManager();
