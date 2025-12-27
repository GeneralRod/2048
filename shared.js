const LEADERBOARD_KEY = 'game2048-leaderboard';
const MAX_LEADERBOARD_ENTRIES = 6;
const DAILY_KEY = 'game2048-daily';
const ACHIEVEMENTS_KEY = 'game2048-achievements';
const SETTINGS_KEY = 'game2048-settings';

const DEFAULT_SETTINGS = {
    animationSpeed: 'normal',
    soundEffects: true,
    gridLines: true,
    theme: 'cold',
    boardSize: 4,
    powerups: {
        cleanse: true,
        double: false,
        undo: true
    },
    ambientVolume: 0.45,
    percussionVolume: 0.35,
    fxVolume: 0.4
};

const ACHIEVEMENTS = [
    {
        id: 'first_merge',
        title: 'First Pulse',
        description: 'Merge any two tiles.',
        check: (state) => state.highestTile >= 4
    },
    {
        id: 'tile_512',
        title: 'Crystal Bloom',
        description: 'Create a 512 tile.',
        check: (state) => state.highestTile >= 512
    },
    {
        id: 'tile_2048',
        title: 'Aurora Sage',
        description: 'Reach the legendary 2048 tile.',
        check: (state) => state.highestTile >= 2048
    },
    {
        id: 'score_8000',
        title: 'Flux Maestro',
        description: 'Score 8,000 points in a single game.',
        check: (state) => state.score >= 8000
    },
    {
        id: 'daily_5',
        title: 'Chrono Voyager',
        description: 'Complete 5 daily challenges.',
        check: (state) => state.dailyCompleted >= 5
    },
    {
        id: 'streak_3',
        title: 'Streak Weaver',
        description: 'Win 3 games in a row.',
        check: (state) => state.winStreak >= 3
    }
];

function readJson(key, fallback = {}) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (err) {
        return fallback;
    }
}

function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function mergeSettings(saved = {}) {
    const merged = structuredClone ? structuredClone(DEFAULT_SETTINGS) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    merged.animationSpeed = saved.animationSpeed || merged.animationSpeed;
    merged.soundEffects = saved.soundEffects !== undefined ? saved.soundEffects : merged.soundEffects;
    merged.gridLines = saved.gridLines !== undefined ? saved.gridLines : merged.gridLines;
    merged.theme = saved.theme || merged.theme;
    merged.boardSize = parseInt(saved.boardSize, 10) || merged.boardSize;
    merged.powerups = {
        cleanse: saved.powerups?.cleanse !== undefined ? saved.powerups.cleanse : merged.powerups.cleanse,
        double: saved.powerups?.double !== undefined ? saved.powerups.double : merged.powerups.double,
        undo: saved.powerups?.undo !== undefined ? saved.powerups.undo : merged.powerups.undo
    };
    merged.ambientVolume = typeof saved.ambientVolume === 'number' ? saved.ambientVolume : merged.ambientVolume;
    merged.percussionVolume = typeof saved.percussionVolume === 'number' ? saved.percussionVolume : merged.percussionVolume;
    merged.fxVolume = typeof saved.fxVolume === 'number' ? saved.fxVolume : merged.fxVolume;
    return merged;
}

window.settingsManager = {
    load() {
        const saved = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
        return mergeSettings(saved);
    },
    save(settings) {
        const merged = mergeSettings(settings);
        saveJson(SETTINGS_KEY, merged);
        return merged;
    }
};

window.leaderboardManager = {
    get(mode) {
        const data = readJson(LEADERBOARD_KEY);
        return data[mode] || [];
    },

    addEntry(mode, score) {
        if (typeof score !== 'number' || score <= 0) return [];
        const data = readJson(LEADERBOARD_KEY);
        if (!data[mode]) data[mode] = [];
        data[mode].push({ score, timestamp: Date.now() });
        data[mode].sort((a, b) => b.score - a.score);
        if (data[mode].length > MAX_LEADERBOARD_ENTRIES) {
            data[mode] = data[mode].slice(0, MAX_LEADERBOARD_ENTRIES);
        }
        saveJson(LEADERBOARD_KEY, data);
        return data[mode];
    }
};

window.formatLeaderboardEntry = function (entry, index) {
    const when = new Date(entry.timestamp).toLocaleString();
    return `${index + 1}. ${entry.score} pts · ${when}`;
};

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function buildDailyBoard(seed) {
    const grid = Array(4).fill().map(() => Array(4).fill(0));
    let currentSeed = seed;
    for (let i = 0; i < 6; i++) {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        const rand = currentSeed / 233280;
        const row = Math.floor(rand * 4);
        const col = Math.floor((seededRandom(rand * 1000) * 4));
        if (grid[row][col] === 0) {
            grid[row][col] = rand > 0.75 ? 4 : 2;
        } else {
            i--;
        }
    }
    return grid;
}

function describeChallenge(meta) {
    return `Score ${meta.targetScore}+ in ${meta.themeName} mode`;
}

window.dailyChallengeManager = {
    getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    },

    getChallenge(dateKey = this.getTodayKey()) {
        const seed = parseInt(dateKey.replace(/-/g, ''), 10);
        const board = buildDailyBoard(seed);
        const targetScore = 1024 + (seed % 4) * 128;
        const themeOptions = ['Aurora Frost', 'Neon Drift', 'Azure Pulse', 'Crystal Bloom'];
        const themeName = themeOptions[seed % themeOptions.length];
        return {
            date: dateKey,
            seed,
            board,
            targetScore,
            themeName,
            description: describeChallenge({targetScore, themeName})
        };
    },

    isCompleted(dateKey = this.getTodayKey()) {
        const data = readJson(DAILY_KEY, { completed: [] });
        return data.completed?.includes(dateKey);
    },

    markCompleted(dateKey = this.getTodayKey()) {
        const data = readJson(DAILY_KEY, { completed: [] });
        if (!data.completed.includes(dateKey)) {
            data.completed.push(dateKey);
            saveJson(DAILY_KEY, data);
        }
        return data.completed.length;
    },

    history(limit = 10) {
        const data = readJson(DAILY_KEY, { completed: [] });
        return data.completed.slice(-limit).reverse();
    }
};

window.achievementManager = {
    list() {
        const unlockedSet = new Set(readJson(ACHIEVEMENTS_KEY, []));
        return ACHIEVEMENTS.map((ach) => ({
            ...ach,
            unlocked: unlockedSet.has(ach.id)
        }));
    },

    summary() {
        const unlocked = readJson(ACHIEVEMENTS_KEY, []);
        return {
            unlocked: unlocked.length,
            total: ACHIEVEMENTS.length
        };
    },

    evaluate(state) {
        const unlocked = new Set(readJson(ACHIEVEMENTS_KEY, []));
        const newlyUnlocked = [];
        ACHIEVEMENTS.forEach((achievement) => {
            if (!unlocked.has(achievement.id) && achievement.check(state)) {
                unlocked.add(achievement.id);
                newlyUnlocked.push(achievement);
            }
        });
        if (newlyUnlocked.length) {
            saveJson(ACHIEVEMENTS_KEY, Array.from(unlocked));
        }
        return newlyUnlocked;
    }
};
