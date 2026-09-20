/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  AppMode, 
  BookSemester, 
  MistakeItem, 
  LevelProgress, 
  UserStats, 
  Achievement 
} from './types';
import { 
  getStoredActiveBook, 
  setStoredActiveBook, 
  getStoredMistakes, 
  getStoredLevels, 
  getStoredStats, 
  updateStats, 
  getStoredAchievements, 
  checkAchievements 
} from './utils/storage';
import { isSoundEnabled, setSoundEnabled, playWinSound } from './utils/audio';
import { Header } from './components/Header';
import { SpellingTest } from './components/SpellingTest';
import { AdventureMode } from './components/AdventureMode';
import { MistakeNotebook } from './components/MistakeNotebook';
import { WordLibrary } from './components/WordLibrary';
import { AchievementsModal } from './components/AchievementsModal';
import { Sparkles, Trophy } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('test');
  const [activeBook, setActiveBook] = useState<BookSemester | 'ALL'>('5A');
  const [soundActive, setSoundActive] = useState<boolean>(true);

  // Stored state
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [levels, setLevels] = useState<Record<string, LevelProgress>>({});
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Modals & toasts
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const savedBook = getStoredActiveBook();
    setActiveBook(savedBook);
    setMistakes(getStoredMistakes());
    setLevels(getStoredLevels());
    setStats(getStoredStats());
    setAchievements(getStoredAchievements());
    setSoundActive(isSoundEnabled());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleBookChange = (book: BookSemester | 'ALL') => {
    setActiveBook(book);
    if (book !== 'ALL') {
      setStoredActiveBook(book);
    }
  };

  const handleToggleSound = () => {
    const nextState = !soundActive;
    setSoundActive(nextState);
    setSoundEnabled(nextState);
  };

  // Called whenever mistakes are added or updated
  const handleMistakesUpdated = (updatedItems: MistakeItem[]) => {
    setMistakes(updatedItems);
    const { list, newUnlocked } = checkAchievements();
    setAchievements(list);
    if (newUnlocked.length > 0) {
      handleNewAchievements(newUnlocked);
    }
  };

  // Called when level progress is saved
  const handleLevelUpdated = (levelId: string, stars: number, score: number) => {
    const nextLevels = getStoredLevels();
    setLevels(nextLevels);

    const totalStars = Object.values(nextLevels).reduce((acc, l) => acc + (l.stars || 0), 0);
    const nextStats = updateStats((prev) => ({
      ...prev,
      starsCount: totalStars,
      totalPracticed: prev.totalPracticed + 1,
    }));
    setStats(nextStats);

    const { list, newUnlocked } = checkAchievements();
    setAchievements(list);
    if (newUnlocked.length > 0) {
      handleNewAchievements(newUnlocked);
    }
  };

  // Called when a spelling test completes
  const handleTestCompleted = (correctCount: number, totalCount: number) => {
    const nextStats = updateStats((prev) => ({
      ...prev,
      totalSpellingTests: prev.totalSpellingTests + 1,
      totalCorrectWords: prev.totalCorrectWords + correctCount,
      totalPracticed: prev.totalPracticed + totalCount,
    }));
    setStats(nextStats);

    const { list, newUnlocked } = checkAchievements();
    setAchievements(list);
    if (newUnlocked.length > 0) {
      handleNewAchievements(newUnlocked);
    }
  };

  const handleNewAchievements = (newItems: Achievement[]) => {
    playWinSound();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.4 },
    });
    newItems.forEach((item) => {
      showToast(`🏆 恭喜获得新荣誉勋章：【${item.title}】！`);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/40 text-slate-800">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl border border-amber-300/40 text-xs sm:text-sm font-black flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        activeBook={activeBook}
        onChangeBook={handleBookChange}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        stats={stats}
        mistakesCount={mistakes.filter((m) => !m.isMastered).length}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentMode === 'test' && (
          <SpellingTest
            activeBook={activeBook}
            onMistakeAdded={handleMistakesUpdated}
            onGoToMistakes={() => setCurrentMode('mistakes')}
            onRecordTestCompleted={handleTestCompleted}
          />
        )}

        {currentMode === 'adventure' && (
          <AdventureMode
            levels={levels}
            activeBook={activeBook}
            onUpdateLevelProgress={handleLevelUpdated}
            onMistakeAdded={handleMistakesUpdated}
            onGoToMistakes={() => setCurrentMode('mistakes')}
          />
        )}

        {currentMode === 'mistakes' && (
          <MistakeNotebook
            mistakes={mistakes}
            onMistakesUpdated={handleMistakesUpdated}
            activeBook={activeBook}
          />
        )}

        {currentMode === 'library' && (
          <WordLibrary
            activeBook={activeBook}
            mistakes={mistakes}
            onMistakeAdded={handleMistakesUpdated}
          />
        )}
      </main>

      {/* Achievements and progress modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
        stats={stats}
      />

      {/* Bottom Footer */}
      <footer className="border-t border-amber-200/60 bg-white/60 py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>小学五年级英语词汇攻克系统 · 2026人教版PEP教材课程标准</span>
          <span className="text-slate-500">
            纯正美音标准发音 · 错题智能归集 · 趣味多维闯关练习
          </span>
        </div>
      </footer>
    </div>
  );
}
