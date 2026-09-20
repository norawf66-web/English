import { MistakeItem, LevelProgress, UserStats, Achievement, VocabularyWord, BookSemester } from '../types';
import { UNIT_METAS } from '../data/vocabularyData';

const STORAGE_KEYS = {
  MISTAKES: 'pep5_mistakes_v1',
  LEVELS: 'pep5_levels_v1',
  STATS: 'pep5_stats_v1',
  ACHIEVEMENTS: 'pep5_achievements_v1',
  ACTIVE_BOOK: 'pep5_active_book_v1',
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_test',
    title: '初出茅庐',
    description: '完成第一次课后单词拼写测试',
    icon: 'Compass',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'streak_master',
    title: '坚持不懈',
    description: '连续坚持学习达到3天',
    icon: 'Flame',
    unlocked: false,
    progress: 1,
    maxProgress: 3,
  },
  {
    id: 'words_50',
    title: '词汇小达人',
    description: '累计正确拼写50个课标单词',
    icon: 'BookOpen',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
  },
  {
    id: 'mistake_hero',
    title: '错题粉碎机',
    description: '成功攻克并消灭5道错题',
    icon: 'Target',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'adventure_clear',
    title: '探险先锋',
    description: '通关任意3个单元趣味闯关关卡',
    icon: 'MapPin',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: 'star_collector',
    title: '摘星高手',
    description: '在闯关模式中累计收集18颗黄金星星',
    icon: 'Star',
    unlocked: false,
    progress: 0,
    maxProgress: 18,
  },
  {
    id: 'perfect_speller',
    title: '满分王者',
    description: '在单次拼写测试中取得100%正确率',
    icon: 'Award',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
];

export function getStoredActiveBook(): BookSemester {
  if (typeof window === 'undefined') return '5A';
  return (localStorage.getItem(STORAGE_KEYS.ACTIVE_BOOK) as BookSemester) || '5A';
}

export function setStoredActiveBook(book: BookSemester) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_BOOK, book);
}

export function getStoredMistakes(): MistakeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMistakes(items: MistakeItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(items));
}

export function recordMistake(word: VocabularyWord, wrongAttempt?: string): MistakeItem[] {
  const current = getStoredMistakes();
  const existingIdx = current.findIndex((m) => m.wordId === word.id);

  const cleanAttempt = wrongAttempt ? wrongAttempt.trim() : '';

  if (existingIdx >= 0) {
    const item = current[existingIdx];
    const attempts = item.wrongAttempts || [];
    if (cleanAttempt && !attempts.includes(cleanAttempt)) {
      attempts.push(cleanAttempt);
    }
    current[existingIdx] = {
      ...item,
      errorCount: item.errorCount + 1,
      consecutiveCorrect: 0,
      isMastered: false,
      lastMistakeTime: Date.now(),
      wrongAttempts: attempts.slice(-5), // keep latest 5 wrong tries
    };
  } else {
    current.unshift({
      wordId: word.id,
      word: word.word,
      phonetic: word.phonetic,
      translation: word.translation,
      unitTitle: word.unitTitle,
      book: word.book,
      errorCount: 1,
      consecutiveCorrect: 0,
      lastMistakeTime: Date.now(),
      lastPracticeTime: Date.now(),
      wrongAttempts: cleanAttempt ? [cleanAttempt] : [],
      isMastered: false,
    });
  }

  saveMistakes(current);
  return current;
}

export function recordMistakePractice(wordId: string, isCorrect: boolean): { mistakes: MistakeItem[]; newlyMastered: boolean } {
  const current = getStoredMistakes();
  const idx = current.findIndex((m) => m.wordId === wordId);
  let newlyMastered = false;

  if (idx >= 0) {
    const item = current[idx];
    if (isCorrect) {
      const nextConsecutive = item.consecutiveCorrect + 1;
      const becomeMastered = nextConsecutive >= 2;
      if (becomeMastered && !item.isMastered) {
        newlyMastered = true;
      }
      current[idx] = {
        ...item,
        consecutiveCorrect: nextConsecutive,
        isMastered: becomeMastered ? true : item.isMastered,
        lastPracticeTime: Date.now(),
      };
    } else {
      current[idx] = {
        ...item,
        errorCount: item.errorCount + 1,
        consecutiveCorrect: 0,
        isMastered: false,
        lastMistakeTime: Date.now(),
        lastPracticeTime: Date.now(),
      };
    }
    saveMistakes(current);
  }

  return { mistakes: current, newlyMastered };
}

export function removeMistake(wordId: string): MistakeItem[] {
  const current = getStoredMistakes().filter((m) => m.wordId !== wordId);
  saveMistakes(current);
  return current;
}

export function clearMasteredMistakes(): MistakeItem[] {
  const current = getStoredMistakes().filter((m) => !m.isMastered);
  saveMistakes(current);
  return current;
}

// LEVEL PROGRESS
export function getStoredLevels(): Record<string, LevelProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEVELS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  // Default initial levels
  const initial: Record<string, LevelProgress> = {};
  UNIT_METAS.forEach((u, idx) => {
    initial[u.id] = {
      levelId: u.id,
      unlocked: idx === 0, // First level (5A-U1) unlocked by default
      stars: 0,
      highScore: 0,
      completedTimes: 0,
    };
  });
  return initial;
}

export function saveLevelProgress(
  levelId: string,
  stars: number,
  score: number
): { levels: Record<string, LevelProgress>; unlockedNextId?: string } {
  const current = getStoredLevels();
  const existing = current[levelId] || {
    levelId,
    unlocked: true,
    stars: 0,
    highScore: 0,
    completedTimes: 0,
  };

  const newStars = Math.max(existing.stars, stars);
  const newHighScore = Math.max(existing.highScore, score);

  current[levelId] = {
    ...existing,
    unlocked: true,
    stars: newStars,
    highScore: newHighScore,
    completedTimes: existing.completedTimes + 1,
  };

  // Find next level to unlock
  const allIds = UNIT_METAS.map((u) => u.id);
  const currentIdx = allIds.indexOf(levelId);
  let unlockedNextId: string | undefined;

  if (currentIdx >= 0 && currentIdx < allIds.length - 1) {
    const nextId = allIds[currentIdx + 1];
    if (!current[nextId] || !current[nextId].unlocked) {
      current[nextId] = {
        ...(current[nextId] || { stars: 0, highScore: 0, completedTimes: 0 }),
        levelId: nextId,
        unlocked: true,
      };
      unlockedNextId = nextId;
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(current));
  }

  return { levels: current, unlockedNextId };
}

// USER STATS
export function getStoredStats(): UserStats {
  const defaultStats: UserStats = {
    totalPracticed: 0,
    totalSpellingTests: 0,
    totalCorrectWords: 0,
    starsCount: 0,
    streakDays: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    masteredMistakesCount: 0,
  };

  if (typeof window === 'undefined') return defaultStats;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);

    // Update streak check
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.lastActiveDate !== today) {
      const lastDate = new Date(parsed.lastActiveDate);
      const diffDays = Math.round((new Date(today).getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        parsed.streakDays = (parsed.streakDays || 1) + 1;
      } else if (diffDays > 1) {
        parsed.streakDays = 1;
      }
      parsed.lastActiveDate = today;
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    return defaultStats;
  }
}

export function updateStats(updater: (prev: UserStats) => UserStats): UserStats {
  const current = getStoredStats();
  const next = updater(current);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(next));
  }
  return next;
}

// ACHIEVEMENTS
export function getStoredAchievements(): Achievement[] {
  if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) return INITIAL_ACHIEVEMENTS;
    const stored: Achievement[] = JSON.parse(raw);

    // Merge in any newly added achievements
    return INITIAL_ACHIEVEMENTS.map((init) => {
      const found = stored.find((s) => s.id === init.id);
      return found || init;
    });
  } catch {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveAchievements(items: Achievement[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
}

export function checkAchievements(): { list: Achievement[]; newUnlocked: Achievement[] } {
  const achievements = getStoredAchievements();
  const stats = getStoredStats();
  const levels = getStoredLevels();
  const mistakes = getStoredMistakes();

  const totalClearedLevels = Object.values(levels).filter((l) => l.completedTimes > 0).length;
  const totalStars = Object.values(levels).reduce((acc, l) => acc + (l.stars || 0), 0);
  const masteredMistakes = mistakes.filter((m) => m.isMastered).length;

  const newUnlocked: Achievement[] = [];

  const updated = achievements.map((ach) => {
    let currentProgress = ach.progress;
    let shouldUnlock = ach.unlocked;

    switch (ach.id) {
      case 'first_test':
        currentProgress = stats.totalSpellingTests;
        shouldUnlock = stats.totalSpellingTests >= 1;
        break;
      case 'streak_master':
        currentProgress = stats.streakDays;
        shouldUnlock = stats.streakDays >= 3;
        break;
      case 'words_50':
        currentProgress = stats.totalCorrectWords;
        shouldUnlock = stats.totalCorrectWords >= 50;
        break;
      case 'mistake_hero':
        currentProgress = masteredMistakes;
        shouldUnlock = masteredMistakes >= 5;
        break;
      case 'adventure_clear':
        currentProgress = totalClearedLevels;
        shouldUnlock = totalClearedLevels >= 3;
        break;
      case 'star_collector':
        currentProgress = totalStars;
        shouldUnlock = totalStars >= 18;
        break;
      case 'perfect_speller':
        // tracked dynamically during tests
        break;
    }

    if (!ach.unlocked && shouldUnlock) {
      newUnlocked.push({
        ...ach,
        unlocked: true,
        unlockedAt: Date.now(),
        progress: Math.min(currentProgress, ach.maxProgress),
      });
      return {
        ...ach,
        unlocked: true,
        unlockedAt: Date.now(),
        progress: Math.min(currentProgress, ach.maxProgress),
      };
    }

    return {
      ...ach,
      progress: Math.min(currentProgress, ach.maxProgress),
    };
  });

  saveAchievements(updated);
  return { list: updated, newUnlocked };
}
