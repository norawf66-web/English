import React from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Flame, 
  Star, 
  BookOpen, 
  Award, 
  Gamepad2, 
  PenTool, 
  BookmarkCheck 
} from 'lucide-react';
import { AppMode, BookSemester, UserStats } from '../types';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  activeBook: BookSemester | 'ALL';
  onChangeBook: (book: BookSemester | 'ALL') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  stats: UserStats;
  mistakesCount: number;
  onOpenAchievements: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  activeBook,
  onChangeBook,
  soundEnabled,
  onToggleSound,
  stats,
  mistakesCount,
  onOpenAchievements,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-amber-200/60 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top brand & meta stats bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-amber-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 font-bold text-xl">
              PEP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
                  五年级英语单词闯关与拼写
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  2026人教版
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                单元课后同步听写 · 趣味多维闯关 · 错题自动攻克
              </p>
            </div>
          </div>

          {/* Gamified status badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Semester Switcher */}
            <div className="flex items-center bg-amber-100/80 p-0.5 rounded-xl text-xs font-bold text-amber-900 border border-amber-200">
              <button
                id="book-btn-5a"
                onClick={() => onChangeBook('5A')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeBook === '5A'
                    ? 'bg-white shadow-xs text-amber-900 font-extrabold'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                五上 (5A)
              </button>
              <button
                id="book-btn-5b"
                onClick={() => onChangeBook('5B')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeBook === '5B'
                    ? 'bg-white shadow-xs text-amber-900 font-extrabold'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                五下 (5B)
              </button>
              <button
                id="book-btn-all"
                onClick={() => onChangeBook('ALL')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  activeBook === 'ALL'
                    ? 'bg-white shadow-xs text-amber-900 font-extrabold'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                全册
              </button>
            </div>

            {/* Streak Counter */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold"
              title={`已连续坚持打卡 ${stats.streakDays} 天`}
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>{stats.streakDays}天</span>
            </div>

            {/* Star count */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
              title={`闯关收集星星：${stats.starsCount} 颗`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{stats.starsCount}</span>
            </div>

            {/* Achievements Modal button */}
            <button
              id="achievements-btn"
              onClick={onOpenAchievements}
              className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
              title="查看学习成就与荣誉勋章"
            >
              <Award className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={onToggleSound}
              className={`p-1.5 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title={soundEnabled ? '音效已开启 (点击静音)' : '音效已静音 (点击开启)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Tab Navigation */}
        <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 pt-2 pb-2 overflow-x-auto no-scrollbar">
          <button
            id="tab-btn-spelling"
            onClick={() => onSelectMode('test')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              currentMode === 'test'
                ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/50'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>课后单词拼写</span>
          </button>

          <button
            id="tab-btn-adventure"
            onClick={() => onSelectMode('adventure')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              currentMode === 'adventure'
                ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-teal-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/50'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>趣味闯关冒险</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold uppercase">
              12关
            </span>
          </button>

          <button
            id="tab-btn-mistakes"
            onClick={() => onSelectMode('mistakes')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap relative ${
              currentMode === 'mistakes'
                ? 'bg-linear-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/50'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>错题智能本</span>
            {mistakesCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                currentMode === 'mistakes'
                  ? 'bg-white text-rose-600'
                  : 'bg-rose-500 text-white animate-pulse'
              }`}>
                {mistakesCount}
              </span>
            )}
          </button>

          <button
            id="tab-btn-library"
            onClick={() => onSelectMode('library')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              currentMode === 'library'
                ? 'bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-purple-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>词汇全书表</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
