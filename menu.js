// Menu page navigation and functionality
let currentScreen = 'settings';
let selectedMode = 'classic';

function goToTitle() {
    window.location.href = 'title.html';
}

function goToGame() {
    window.location.href = `game.html?mode=${selectedMode}`;
}

function showSettings() {
    document.getElementById('settings-screen').classList.add('active');
    document.getElementById('game-modes-screen').classList.remove('active');
    currentScreen = 'settings';
}

function showGameModes() {
    document.getElementById('settings-screen').classList.remove('active');
    document.getElementById('game-modes-screen').classList.add('active');
    currentScreen = 'modes';
}

function startMode(mode) {
    selectedMode = mode;
    goToGame();
}

function saveSettings() {
    const settings = {
        animationSpeed: document.getElementById('animation-speed').value,
        soundEffects: document.getElementById('sound-effects').checked,
        gridLines: document.getElementById('grid-lines').checked,
        theme: document.getElementById('theme').value
    };
    
    localStorage.setItem('game2048-settings', JSON.stringify(settings));
    
    // Show saved confirmation
    const saveButton = document.querySelector('.settings-buttons .primary');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saved!';
    saveButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
    
    setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.background = '';
        showGameModes();
    }, 1000);
}

// Load settings on page load
document.addEventListener('DOMContentLoaded', function() {
    const saved = localStorage.getItem('game2048-settings');
    if (saved) {
        const settings = JSON.parse(saved);
        document.getElementById('animation-speed').value = settings.animationSpeed || 'normal';
        document.getElementById('sound-effects').checked = settings.soundEffects !== false;
        document.getElementById('grid-lines').checked = settings.gridLines !== false;
        document.getElementById('theme').value = settings.theme || 'cold';
    }
    
    // Add hover effects to mode cards
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});
