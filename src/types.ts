export type BookSemester = '5A' | '5B';

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  translation: string;
  partOfSpeech: string;
  example: string;
  exampleCn: string;
  book: BookSemester;
  unit: number; // 1 - 6
  unitTitle: string;
  category?: string;
  audioKeyword?: string;
}

export interface UnitMeta {
  id: string;
  book: BookSemester;
  unit: number;
  title: string;
  topic: string;
  description: string;
  themeColor: string;
  iconName: string;
}

export interface MistakeItem {
  wordId: string;
  word: string;
  phonetic: string;
  translation: string;
  unitTitle: string;
  book: BookSemester;
  errorCount: number;
  consecutiveCorrect: number; // 3 consecutive correct moves to mastered
  lastMistakeTime: number; // timestamp
  lastPracticeTime: number;
  wrongAttempts: string[]; // records of wrong inputs entered by the student
  isMastered: boolean;
}

export interface LevelProgress {
  levelId: string;
  unlocked: boolean;
  stars: number; // 0-3
  highScore: number;
  completedTimes: number;
}

export interface UserStats {
  totalPracticed: number;
  totalSpellingTests: number;
  totalCorrectWords: number;
  starsCount: number;
  streakDays: number;
  lastActiveDate: string;
  masteredMistakesCount: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

export type AppMode = 'test' | 'adventure' | 'mistakes' | 'library' | 'achievements';
