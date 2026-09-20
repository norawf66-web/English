import React, { useState } from 'react';
import { 
  BookOpen, 
  Volume2, 
  Volume1, 
  Search, 
  BookmarkPlus, 
  Check, 
  Filter, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { VocabularyWord, BookSemester, MistakeItem } from '../types';
import { VOCABULARY_LIST, UNIT_METAS } from '../data/vocabularyData';
import { speakWord } from '../utils/audio';
import { recordMistake } from '../utils/storage';

interface WordLibraryProps {
  activeBook: BookSemester | 'ALL';
  mistakes: MistakeItem[];
  onMistakeAdded: (mistakes: MistakeItem[]) => void;
}

export const WordLibrary: React.FC<WordLibraryProps> = ({
  activeBook,
  mistakes,
  onMistakeAdded,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [justAddedWordId, setJustAddedWordId] = useState<string | null>(null);

  const filteredUnits = UNIT_METAS.filter(
    (u) => activeBook === 'ALL' || u.book === activeBook
  );

  const filteredWords = VOCABULARY_LIST.filter((w) => {
    if (activeBook !== 'ALL' && w.book !== activeBook) return false;
    if (selectedUnitId !== 'all') {
      const [book, uStr] = selectedUnitId.split('-U');
      const uNum = parseInt(uStr, 10);
      if (w.book !== book || w.unit !== uNum) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        w.word.toLowerCase().includes(q) ||
        w.translation.includes(q) ||
        w.example.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddToMistakes = (w: VocabularyWord) => {
    const updated = recordMistake(w, '用户主动添加复习');
    onMistakeAdded(updated);
    setJustAddedWordId(w.id);
    setTimeout(() => {
      setJustAddedWordId(null);
    }, 1500);
  };

  const isAlreadyInMistakes = (id: string) =>
    mistakes.some((m) => m.wordId === id && !m.isMastered);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                2026人教版五年级·全册词汇宝典
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                收录五年级上册及下册全部重点四会词汇、标准音标、实用教材例句及标准朗读
              </p>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            共收录 <strong className="text-indigo-600 text-sm">{filteredWords.length}</strong> 个教材核心单词/短语
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-2xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Unit selector pill scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedUnitId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedUnitId === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部单元 ({filteredWords.length})
            </button>
            {filteredUnits.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUnitId(u.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedUnitId === u.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {u.book} U{u.unit}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索英文单词、中文或例句..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-indigo-400 outline-hidden transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Words Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredWords.map((word) => {
          const inMistakes = isAlreadyInMistakes(word.id);
          const justAdded = justAddedWordId === word.id;

          return (
            <div
              key={word.id}
              className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top header row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                    {word.unitTitle}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speakWord(word.word, false)}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                      title="正常发音"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => speakWord(word.word, true)}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-[10px] font-bold"
                      title="慢速发音"
                    >
                      <Volume1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAddToMistakes(word)}
                      disabled={inMistakes}
                      className={`p-1.5 rounded-lg border transition-all ${
                        inMistakes || justAdded
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                      title={inMistakes ? '已在错题本中' : '加入错题本巩固'}
                    >
                      {justAdded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Word & phonetic */}
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {word.word}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {word.phonetic}
                  </span>
                  <span className="text-xs font-bold text-indigo-600">
                    [{word.partOfSpeech}]
                  </span>
                </div>

                <div className="text-sm font-bold text-amber-950 mb-3">
                  {word.translation}
                </div>
              </div>

              {/* Example sentence */}
              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                <p className="font-semibold text-slate-700">{word.example}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{word.exampleCn}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
