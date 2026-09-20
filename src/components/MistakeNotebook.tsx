import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  BookmarkCheck, 
  Trash2, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  Play, 
  Flame, 
  Sparkles, 
  RotateCcw, 
  AlertTriangle, 
  HelpCircle,
  Volume1,
  Target,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { MistakeItem, BookSemester, VocabularyWord } from '../types';
import { VOCABULARY_LIST } from '../data/vocabularyData';
import { playCorrectSound, playErrorSound, playWinSound, speakWord } from '../utils/audio';
import { removeMistake, recordMistakePractice, clearMasteredMistakes } from '../utils/storage';

interface MistakeNotebookProps {
  mistakes: MistakeItem[];
  onMistakesUpdated: (items: MistakeItem[]) => void;
  activeBook: BookSemester | 'ALL';
}

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({
  mistakes,
  onMistakesUpdated,
  activeBook,
}) => {
  const [filterTab, setFilterTab] = useState<'pending' | 'mastered' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drill Mode State
  const [isDrilling, setIsDrilling] = useState<boolean>(false);
  const [drillList, setDrillList] = useState<MistakeItem[]>([]);
  const [drillIndex, setDrillIndex] = useState<number>(0);
  const [drillInput, setDrillInput] = useState<string>('');
  const [isDrillAnswered, setIsDrillAnswered] = useState<boolean>(false);
  const [isDrillCorrect, setIsDrillCorrect] = useState<boolean>(false);
  const [drillFinished, setDrillFinished] = useState<boolean>(false);
  const [drillStats, setDrillStats] = useState<{ masteredCount: number }>({ masteredCount: 0 });

  // Filter items
  const filteredMistakes = mistakes
    .filter((m) => activeBook === 'ALL' || m.book === activeBook)
    .filter((m) => {
      if (filterTab === 'pending') return !m.isMastered;
      if (filterTab === 'mastered') return m.isMastered;
      return true;
    })
    .filter((m) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return m.word.toLowerCase().includes(q) || m.translation.includes(q);
    })
    .sort((a, b) => b.errorCount - a.errorCount);

  const pendingCount = mistakes.filter((m) => !m.isMastered).length;
  const masteredCount = mistakes.filter((m) => m.isMastered).length;

  const handleDelete = (wordId: string) => {
    const updated = removeMistake(wordId);
    onMistakesUpdated(updated);
  };

  const handleClearMastered = () => {
    if (window.confirm('确定清除所有已攻克的错题吗？')) {
      const updated = clearMasteredMistakes();
      onMistakesUpdated(updated);
    }
  };

  // Start Targeted Drill
  const startMistakeDrill = () => {
    const candidates = mistakes.filter((m) => !m.isMastered);
    if (candidates.length === 0) return;

    setDrillList([...candidates].sort(() => Math.random() - 0.5));
    setDrillIndex(0);
    setDrillInput('');
    setIsDrillAnswered(false);
    setIsDrillCorrect(false);
    setDrillFinished(false);
    setDrillStats({ masteredCount: 0 });
    setIsDrilling(true);

    setTimeout(() => {
      speakWord(candidates[0].word);
    }, 300);
  };

  const currentDrillItem = drillList[drillIndex];

  const handleDrillSubmit = () => {
    if (!currentDrillItem || isDrillAnswered) return;
    const cleanTarget = currentDrillItem.word.toLowerCase().trim();
    const cleanInput = drillInput.toLowerCase().trim();
    const correct = cleanTarget === cleanInput;

    setIsDrillCorrect(correct);
    setIsDrillAnswered(true);

    const { mistakes: nextMistakes, newlyMastered } = recordMistakePractice(
      currentDrillItem.wordId,
      correct
    );
    onMistakesUpdated(nextMistakes);

    if (correct) {
      playCorrectSound();
      speakWord(currentDrillItem.word);
      if (newlyMastered) {
        setDrillStats((prev) => ({ masteredCount: prev.masteredCount + 1 }));
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } else {
      playErrorSound();
    }
  };

  const handleNextDrillWord = () => {
    if (drillIndex + 1 < drillList.length) {
      const nextIdx = drillIndex + 1;
      setDrillIndex(nextIdx);
      setDrillInput('');
      setIsDrillAnswered(false);
      setIsDrillCorrect(false);

      setTimeout(() => {
        speakWord(drillList[nextIdx].word);
      }, 300);
    } else {
      setDrillFinished(true);
      playWinSound();
    }
  };

  // ================= RENDER DRILL IN PROGRESS =================
  if (isDrilling) {
    if (drillFinished) {
      return (
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-md text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800">
              本次错题消灭演练完成！
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              成功强化了 {drillList.length} 道错题，其中 {drillStats.masteredCount} 道已完全攻克！
            </p>

            <div className="mt-6">
              <button
                onClick={() => setIsDrilling(false)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-500/20 transition-all"
              >
                返回错题本列表
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4 bg-white p-3 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold text-slate-700">
              错题专项消灭营 ({drillIndex + 1}/{drillList.length})
            </span>
          </div>
          <button
            onClick={() => setIsDrilling(false)}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            退出练习
          </button>
        </div>

        {/* Drill Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm text-center">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
            累计错误 {currentDrillItem.errorCount} 次 · 连续答对 {currentDrillItem.consecutiveCorrect}/2
          </div>

          <div className="text-2xl sm:text-3xl font-black text-slate-800 my-3">
            {currentDrillItem.translation}
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs text-slate-400 font-mono">
              {currentDrillItem.phonetic}
            </span>
            <button
              onClick={() => speakWord(currentDrillItem.word)}
              className="p-1.5 rounded-lg bg-amber-100/70 hover:bg-amber-200 text-amber-800 transition-colors"
              title="听音"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Input Box */}
          <div className="my-4">
            <input
              type="text"
              autoFocus
              disabled={isDrillAnswered}
              value={drillInput}
              onChange={(e) => setDrillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (!isDrillAnswered) handleDrillSubmit();
                  else handleNextDrillWord();
                }
              }}
              placeholder="在此重新拼写该单词..."
              className={`w-full text-center text-lg font-bold py-3 px-4 rounded-2xl border-2 transition-all outline-hidden ${
                isDrillAnswered
                  ? isDrillCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-rose-500 bg-rose-50 text-rose-900'
                  : 'border-amber-300 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Feedback */}
          {isDrillAnswered && (
            <div className="mb-4">
              {isDrillCorrect ? (
                <div className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>拼写正确！再接再厉！</span>
                </div>
              ) : (
                <div className="text-sm font-bold text-rose-600">
                  拼写错误！正确答案是：
                  <span className="font-mono text-base font-black ml-1 text-slate-900">
                    {currentDrillItem.word}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            {!isDrillAnswered ? (
              <button
                onClick={handleDrillSubmit}
                disabled={!drillInput.trim()}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 disabled:opacity-40"
              >
                验证答案
              </button>
            ) : (
              <button
                onClick={handleNextDrillWord}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm flex items-center justify-center gap-2"
              >
                <span>下一道错题</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER MISTAKE LIST VIEW =================
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 font-black">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                人教版英语·智能错题本
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                测试与闯关中做错的单词将自动汇集于此，针对性消灭记忆盲区
              </p>
            </div>
          </div>

          {/* Quick Drill CTA */}
          {pendingCount > 0 ? (
            <button
              id="start-drill-btn"
              onClick={startMistakeDrill}
              className="px-5 py-3 rounded-2xl bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-sm shadow-md shadow-rose-500/25 flex items-center gap-2 transition-all active:scale-95 shrink-0"
            >
              <Target className="w-4 h-4" />
              <span>开始错题消灭营 ({pendingCount}词)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>暂无待消灭错题，基础很扎实！</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold">总收集错题</div>
            <div className="text-xl font-black text-slate-800">{mistakes.length} 词</div>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-2xl">
            <div className="text-xs text-rose-500 font-semibold">待巩固消灭</div>
            <div className="text-xl font-black text-rose-600">{pendingCount} 词</div>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-2xl">
            <div className="text-xs text-emerald-600 font-semibold">已成功攻克</div>
            <div className="text-xl font-black text-emerald-700">{masteredCount} 词</div>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-2xl">
            <div className="text-xs text-amber-700 font-semibold">攻克达成率</div>
            <div className="text-xl font-black text-amber-800">
              {mistakes.length > 0 ? Math.round((masteredCount / mistakes.length) * 100) : 100}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-amber-200 shadow-2xs">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'pending'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            待消灭 ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('mastered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'mastered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            已攻克 ({masteredCount})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部 ({mistakes.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="搜索错题英文或中文..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden w-full sm:w-48 shadow-2xs"
          />

          {masteredCount > 0 && (
            <button
              onClick={handleClearMastered}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shrink-0"
              title="一键清理所有已攻克的错题"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mistake Items Grid */}
      {filteredMistakes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-amber-200 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? '没有找到匹配的错题' : '太棒了！当前分类下没有错题！'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            在「课后单词拼写」或「趣味闯关」中产生的拼写失误将自动收录到这里
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMistakes.map((item) => (
            <div
              key={item.wordId}
              className={`p-4 rounded-2xl border transition-all bg-white relative ${
                item.isMastered
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-rose-200/80 shadow-xs hover:border-rose-400'
              }`}
            >
              {/* Header tags */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                    {item.book}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                    {item.unitTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {item.isMastered ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      已攻克
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      已错 {item.errorCount} 次
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(item.wordId)}
                    className="text-slate-300 hover:text-rose-500 p-1"
                    title="移除出本"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Word & Phonetic */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">
                      {item.word}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">{item.phonetic}</span>
                  </div>
                  <p className="text-sm font-bold text-amber-900 mt-0.5">
                    {item.translation}
                  </p>
                </div>

                {/* Pronounce button */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => speakWord(item.word, false)}
                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                    title="发音"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => speakWord(item.word, true)}
                    className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors text-[10px] font-bold"
                    title="慢速"
                  >
                    <Volume1 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Past wrong attempts */}
              {item.wrongAttempts && item.wrongAttempts.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="text-rose-500 font-semibold">曾误拼为: </span>
                  <span className="font-mono text-slate-700 line-through">
                    {item.wrongAttempts.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
