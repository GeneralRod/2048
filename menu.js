// Menu page navigation and functionality
let currentScreen = 'settings';
let selectedMode = 'classic';
const leaderboardModeSelect = document.getElementById('leaderboard-mode');
const leaderboardList = document.getElementById('leaderboard-list');
const dailyStatusEl = document.getElementById('daily-status');
const dailyThemeEl = document.getElementById('daily-theme');
const dailyTargetEl = document.getElementById('daily-target');
const dailyDescriptionEl = document.getElementById('daily-description');
const startDailyButton = document.getElementById('start-daily');
const viewChallengesButton = document.getElementById('view-challenges');
const challengeHistoryModal = document.getElementById('challenge-history-modal');
const challengeHistoryList = document.getElementById('challenge-history-list');
const closeHistoryButton = document.getElementById('close-history');
const achievementsModal = document.getElementById('achievements-modal');
const achievementsList = document.getElementById('achievement-list');
const viewAchievementsButton = document.getElementById('view-achievements');
const closeAchievementsButton = document.getElementById('close-achievements');
const achievementSummaryEl = document.getElementById('achievement-summary');

function refreshLeaderboard(mode) {
    if (!leaderboardList) return;
    const entries = leaderboardManager.get(mode);
    leaderboardList.innerHTML = '';
    if (!entries.length) {
        const placeholder = document.createElement('li');
        placeholder.className = 'empty';
        placeholder.textContent = 'No results yet. Play a game to add a score.';
        leaderboardList.appendChild(placeholder);
        return;
    }
    entries.forEach((entry, index) => {
        const item = document.createElement('li');
        item.textContent = formatLeaderboardEntry(entry, index);
        leaderboardList.appendChild(item);
    });
}

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

function collectSettingsFromForm() {
    return {
        animationSpeed: document.getElementById('animation-speed').value,
        soundEffects: document.getElementById('sound-effects').checked,
        gridLines: document.getElementById('grid-lines').checked,
        theme: document.getElementById('theme').value,
        boardSize: parseInt(document.getElementById('board-size').value, 10),
        powerups: {
            cleanse: document.getElementById('powerup-cleanse').checked,
            double: document.getElementById('powerup-double').checked,
            undo: document.getElementById('powerup-undo').checked
        },
        ambientVolume: parseFloat(document.getElementById('ambient-volume').value),
        percussionVolume: parseFloat(document.getElementById('percussion-volume').value),
        fxVolume: parseFloat(document.getElementById('fx-volume').value)
    };
}

function populateSettingsForm(settings) {
    document.getElementById('animation-speed').value = settings.animationSpeed;
    document.getElementById('sound-effects').checked = settings.soundEffects;
    document.getElementById('grid-lines').checked = settings.gridLines;
    document.getElementById('theme').value = settings.theme;
    document.getElementById('board-size').value = settings.boardSize;
    document.getElementById('powerup-cleanse').checked = settings.powerups.cleanse;
    document.getElementById('powerup-double').checked = settings.powerups.double;
    document.getElementById('powerup-undo').checked = settings.powerups.undo;
    document.getElementById('ambient-volume').value = settings.ambientVolume;
    document.getElementById('percussion-volume').value = settings.percussionVolume;
    document.getElementById('fx-volume').value = settings.fxVolume;
}

function saveSettings() {
    const settings = collectSettingsFromForm();
    if (window.settingsManager) {
        settingsManager.save(settings);
    } else {
        localStorage.setItem('game2048-settings', JSON.stringify(settings));
    }
    
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

function renderDailyCard() {
    if (!dailyDescriptionEl) return;
    const challenge = dailyChallengeManager.getChallenge();
    const completed = dailyChallengeManager.isCompleted(challenge.date);
    dailyDescriptionEl.textContent = challenge.description;
    dailyThemeEl.textContent = challenge.themeName;
    dailyTargetEl.textContent = `Target ${challenge.targetScore}`;
    dailyStatusEl.textContent = completed ? 'Completed' : 'Ready';
    dailyStatusEl.classList.toggle('completed', completed);
    startDailyButton.disabled = completed;
}

function openChallengeHistory() {
    if (!challengeHistoryModal) return;
    const history = dailyChallengeManager.history();
    challengeHistoryList.innerHTML = '';
    if (!history.length) {
        const li = document.createElement('li');
        li.textContent = 'No completed challenges yet.';
        challengeHistoryList.appendChild(li);
    } else {
        history.forEach((dateKey) => {
            const li = document.createElement('li');
            li.textContent = `✔ ${dateKey}`;
            challengeHistoryList.appendChild(li);
        });
    }
    challengeHistoryModal.classList.remove('hidden');
}

function closeChallengeHistory() {
    if (challengeHistoryModal) {
        challengeHistoryModal.classList.add('hidden');
    }
}

function renderAchievementSummary() {
    if (!achievementSummaryEl) return;
    const summary = achievementManager.summary();
    achievementSummaryEl.textContent = `${summary.unlocked}/${summary.total} badges unlocked`;
}

function openAchievementsModal() {
    if (!achievementsModal) return;
    achievementsList.innerHTML = '';
    const achievements = achievementManager.list();
    achievements.forEach((achievement) => {
        const li = document.createElement('li');
        li.className = achievement.unlocked ? 'unlocked' : '';
        li.innerHTML = `
            <div>
                <strong>${achievement.title}</strong>
                <p>${achievement.description}</p>
            </div>
            <span>${achievement.unlocked ? 'Unlocked' : 'Locked'}</span>
        `;
        achievementsList.appendChild(li);
    });
    achievementsModal.classList.remove('hidden');
}

function closeAchievementsModal() {
    if (achievementsModal) {
        achievementsModal.classList.add('hidden');
    }
}

function launchDailyChallenge() {
    const challenge = dailyChallengeManager.getChallenge();
    localStorage.setItem('game2048-daily-active', JSON.stringify(challenge));
    selectedMode = 'daily';
    goToGame();
}

// Load settings on page load
document.addEventListener('DOMContentLoaded', function() {
    const settings = window.settingsManager ? settingsManager.load() : collectSettingsFromForm();
    populateSettingsForm(settings);
    
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    if (leaderboardModeSelect) {
        refreshLeaderboard(leaderboardModeSelect.value);
        leaderboardModeSelect.addEventListener('change', (event) => {
            refreshLeaderboard(event.target.value);
        });
    }
    window.addEventListener('leaderboardUpdated', (event) => {
        const { mode } = event.detail || {};
        const targetMode = mode || (leaderboardModeSelect ? leaderboardModeSelect.value : 'classic');
        refreshLeaderboard(targetMode);
    });

    if (startDailyButton) startDailyButton.addEventListener('click', launchDailyChallenge);
    if (viewChallengesButton) viewChallengesButton.addEventListener('click', openChallengeHistory);
    if (closeHistoryButton) closeHistoryButton.addEventListener('click', closeChallengeHistory);
    if (viewAchievementsButton) viewAchievementsButton.addEventListener('click', () => {
        renderAchievementSummary();
        openAchievementsModal();
    });
    if (closeAchievementsButton) closeAchievementsButton.addEventListener('click', closeAchievementsModal);
    renderDailyCard();
    renderAchievementSummary();
});
