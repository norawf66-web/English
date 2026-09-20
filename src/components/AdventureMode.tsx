import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Lock, 
  Unlock, 
  Star, 
  Heart, 
  RotateCcw, 
  ArrowRight, 
  Trophy, 
  Sparkles, 
  Volume2, 
  Gamepad2, 
  Play, 
  Flame, 
  Check, 
  AlertCircle,
  HelpCircle,
  Zap,
  BookmarkPlus
} from 'lucide-react';
import { UnitMeta, VocabularyWord, LevelProgress, BookSemester, MistakeItem } from '../types';
import { UNIT_METAS, VOCABULARY_LIST } from '../data/vocabularyData';
import { playCorrectSound, playErrorSound, playWinSound, playPopSound, playStarSound, speakWord } from '../utils/audio';
import { saveLevelProgress, recordMistake } from '../utils/storage';

interface AdventureModeProps {
  levels: Record<string, LevelProgress>;
  activeBook: BookSemester | 'ALL';
  onUpdateLevelProgress: (levelId: string, stars: number, score: number) => void;
  onMistakeAdded: (mistakes: MistakeItem[]) => void;
  onGoToMistakes: () => void;
}

type MiniGameType = 'scramble' | 'speed_match' | 'balloon_blank' | 'cloze';

interface GameQuestion {
  type: MiniGameType;
  word: VocabularyWord;
  // For scramble
  scrambledLetters?: { id: string; char: string }[];
  // For speed match
  matchPairs?: { en: string; cn: string; wordObj: VocabularyWord }[];
  // For balloon / cloze
  options?: string[];
  blankDisplay?: string;
  missingChar?: string;
}

export const AdventureMode: React.FC<AdventureModeProps> = ({
  levels,
  activeBook,
  onUpdateLevelProgress,
  onMistakeAdded,
  onGoToMistakes,
}) => {
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'cleared' | 'gameover'>('lobby');

  // Gameplay state
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(3);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);

  // Scramble specific state
  const [assembledLetters, setAssembledLetters] = useState<{ id: string; char: string }[]>([]);
  const [availableScrambleLetters, setAvailableScrambleLetters] = useState<{ id: string; char: string }[]>([]);

  // Speed match specific state
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedCn, setSelectedCn] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  // Mistake tracking during current session
  const [sessionMistakes, setSessionMistakes] = useState<VocabularyWord[]>([]);

  // Filtered unit list
  const displayUnits = UNIT_METAS.filter(
    (u) => activeBook === 'ALL' || u.book === activeBook
  );

  // Prepare level questions
  const startLevel = (levelId: string) => {
    const meta = UNIT_METAS.find((u) => u.id === levelId);
    if (!meta) return;

    const unitWords = VOCABULARY_LIST.filter(
      (w) => w.book === meta.book && w.unit === meta.unit
    );

    if (unitWords.length === 0) return;

    // Create 5 mixed mini-game questions for this level
    const pool = [...unitWords].sort(() => Math.random() - 0.5);
    const generatedQuestions: GameQuestion[] = [];

    pool.slice(0, Math.min(6, pool.length)).forEach((w, idx) => {
      const modeRoll = idx % 4;

      if (modeRoll === 0) {
        // Scramble letters
        const cleanLetters = w.word.toLowerCase().replace(/[^a-z]/g, '').split('');
        const letterObjs = cleanLetters.map((char, i) => ({
          id: `${char}-${i}-${Math.random()}`,
          char,
        }));
        const scrambled = [...letterObjs].sort(() => Math.random() - 0.5);

        generatedQuestions.push({
          type: 'scramble',
          word: w,
          scrambledLetters: scrambled,
        });
      } else if (modeRoll === 1 && unitWords.length >= 3) {
        // Balloon missing letter
        const clean = w.word.replace(/[^a-zA-Z]/g, '');
        const targetIdx = Math.floor(Math.random() * clean.length);
        const missingChar = clean[targetIdx].toLowerCase();

        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((c) => c !== missingChar);
        const wrongOpts = alphabet.sort(() => Math.random() - 0.5).slice(0, 3);
        const allOpts = [...wrongOpts, missingChar].sort(() => Math.random() - 0.5);

        const blankDisplay = clean
          .split('')
          .map((c, i) => (i === targetIdx ? '__' : c))
          .join(' ');

        generatedQuestions.push({
          type: 'balloon_blank',
          word: w,
          options: allOpts,
          blankDisplay,
          missingChar,
        });
      } else if (modeRoll === 2) {
        // Cloze in textbook sentence
        const otherWords = VOCABULARY_LIST.filter((ow) => ow.id !== w.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 2)
          .map((ow) => ow.word);

        const options = [w.word, ...otherWords].sort(() => Math.random() - 0.5);

        generatedQuestions.push({
          type: 'cloze',
          word: w,
          options,
        });
      } else {
        // Quick definition choice
        const otherWords = VOCABULARY_LIST.filter((ow) => ow.id !== w.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((ow) => ow.translation);

        const options = [w.translation, ...otherWords].sort(() => Math.random() - 0.5);

        generatedQuestions.push({
          type: 'cloze',
          word: w,
          options,
        });
      }
    });

    setQuestions(generatedQuestions);
    setActiveLevelId(levelId);
    setCurrentQIndex(0);
    setHearts(3);
    setScore(0);
    setCombo(0);
    setSessionMistakes([]);
    setGameState('playing');

    // Initialize first question
    initQuestionState(generatedQuestions[0]);
  };

  const initQuestionState = (q: GameQuestion) => {
    if (!q) return;
    speakWord(q.word.word);

    if (q.type === 'scramble' && q.scrambledLetters) {
      setAvailableScrambleLetters([...q.scrambledLetters]);
      setAssembledLetters([]);
    }
  };

  const handleLevelFail = () => {
    setGameState('gameover');
    playErrorSound();
  };

  const handleLevelPass = () => {
    setGameState('cleared');
    const finalStars = hearts === 3 ? 3 : hearts === 2 ? 2 : 1;
    const finalScore = score + hearts * 100;

    if (activeLevelId) {
      onUpdateLevelProgress(activeLevelId, finalStars, finalScore);
      saveLevelProgress(activeLevelId, finalStars, finalScore);
    }

    playWinSound();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
    });
  };

  const handleWrong = (word: VocabularyWord) => {
    playErrorSound();
    setCombo(0);
    const nextHearts = hearts - 1;
    setHearts(nextHearts);

    // Record mistake
    const updated = recordMistake(word, '闯关挑战失误');
    onMistakeAdded(updated);
    setSessionMistakes((prev) => (prev.some((w) => w.id === word.id) ? prev : [...prev, word]));

    if (nextHearts <= 0) {
      handleLevelFail();
    }
  };

  const handleCorrect = (points = 100) => {
    playCorrectSound();
    const newCombo = combo + 1;
    setCombo(newCombo);
    setScore((prev) => prev + points + newCombo * 20);

    if (newCombo % 3 === 0) {
      playStarSound();
    }

    // Go to next question
    if (currentQIndex + 1 < questions.length) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      initQuestionState(questions[nextIdx]);
    } else {
      handleLevelPass();
    }
  };

  // Scramble handlers
  const handlePickLetter = (item: { id: string; char: string }) => {
    playPopSound();
    setAvailableScrambleLetters((prev) => prev.filter((l) => l.id !== item.id));
    const nextAssembled = [...assembledLetters, item];
    setAssembledLetters(nextAssembled);

    const currentQ = questions[currentQIndex];
    const targetClean = currentQ.word.word.toLowerCase().replace(/[^a-z]/g, '');
    const currentStr = nextAssembled.map((l) => l.char).join('');

    if (currentStr.length === targetClean.length) {
      if (currentStr === targetClean) {
        handleCorrect(150);
      } else {
        handleWrong(currentQ.word);
        // Reset assembly
        setTimeout(() => {
          if (currentQ.scrambledLetters) {
            setAvailableScrambleLetters([...currentQ.scrambledLetters]);
            setAssembledLetters([]);
          }
        }, 500);
      }
    }
  };

  const handleUndoLetter = (item: { id: string; char: string }) => {
    playPopSound();
    setAssembledLetters((prev) => prev.filter((l) => l.id !== item.id));
    setAvailableScrambleLetters((prev) => [...prev, item]);
  };

  // ================= RENDER LOBBY (LEVEL MAP) =================
  if (gameState === 'lobby') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  人教版五年级英语·趣味闯关冒险
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  按单元逐步解锁，包含字母重组、气球爆破、情境填词等多重趣味玩法
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>每关获得 1-3 颗黄金星星，全通关解锁“探险王者”勋章！</span>
            </div>
          </div>
        </div>

        {/* Level Grid Map */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayUnits.map((u, idx) => {
            const levelData = levels[u.id] || {
              levelId: u.id,
              unlocked: idx === 0,
              stars: 0,
              highScore: 0,
              completedTimes: 0,
            };

            const isUnlocked = levelData.unlocked;

            return (
              <div
                key={u.id}
                id={`level-card-${u.id}`}
                className={`relative rounded-3xl border p-5 transition-all overflow-hidden ${
                  isUnlocked
                    ? 'bg-white border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400'
                    : 'bg-slate-100/80 border-slate-200 opacity-70'
                }`}
              >
                {/* Top header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800">
                      第 {idx + 1} 关
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {u.book}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= levelData.stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 fill-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Title & Topic */}
                <h3 className="font-extrabold text-slate-800 text-base mb-1 truncate" title={u.title}>
                  {u.title}
                </h3>
                <p className="text-xs font-bold text-amber-700 mb-1">{u.topic}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
                  {u.description}
                </p>

                {/* Footer action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {levelData.highScore > 0 ? (
                      <span>最高分: <strong className="text-amber-600">{levelData.highScore}</strong></span>
                    ) : (
                      <span>未通关</span>
                    )}
                  </div>

                  {isUnlocked ? (
                    <button
                      id={`play-level-btn-${u.id}`}
                      onClick={() => startLevel(u.id)}
                      className="px-4 py-1.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{levelData.completedTimes > 0 ? '再次闯关' : '立即开始'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>需通关前一关</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= RENDER LEVEL CLEARED / GAME OVER =================
  if (gameState === 'cleared' || gameState === 'gameover') {
    const isCleared = gameState === 'cleared';
    const finalStars = hearts === 3 ? 3 : hearts === 2 ? 2 : 1;

    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-lg text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-3 shadow-inner">
            {isCleared ? (
              <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Trophy className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-800">
            {isCleared ? '闯关成功！Level Cleared!' : '闯关失败，生命值耗尽！'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isCleared ? '你展现了非凡的英语词汇实力！' : '别灰心，复习一下错题再来挑战吧！'}
          </p>

          {/* Star rating if cleared */}
          {isCleared && (
            <div className="flex items-center justify-center gap-2 my-5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-8 h-8 transition-transform duration-300 ${
                    s <= finalStars
                      ? 'text-amber-400 fill-amber-400 scale-110 animate-bounce'
                      : 'text-slate-200 fill-slate-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Score stat */}
          <div className="my-5 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 inline-block px-8">
            <div className="text-xs font-bold text-slate-500">本关得分</div>
            <div className="text-3xl font-black text-amber-600">{score}</div>
          </div>

          {/* Mistake notice if any mistakes occurred */}
          {sessionMistakes.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-rose-900">
                  本轮失误单词 ({sessionMistakes.length}个) 已自动存入错题本：
                </div>
                <div className="text-xs text-rose-700 mt-0.5 font-medium">
                  {sessionMistakes.map((m) => m.word).join(', ')}
                </div>
              </div>
              <button
                onClick={onGoToMistakes}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shrink-0 hover:bg-rose-700 transition-colors"
              >
                去复习
              </button>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (activeLevelId) startLevel(activeLevelId);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新挑战</span>
            </button>

            <button
              onClick={() => setGameState('lobby')}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 transition-all"
            >
              返回关卡地图
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER ACTIVE GAMEPLAY =================
  const currentQ = questions[currentQIndex];
  if (!currentQ) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* HUD Header Bar */}
      <div className="mb-4 bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-3">
        {/* Hearts */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((h) => (
            <Heart
              key={h}
              className={`w-5 h-5 transition-all ${
                h <= hearts
                  ? 'text-rose-500 fill-rose-500 scale-105'
                  : 'text-slate-200 fill-slate-200 scale-95'
              }`}
            />
          ))}
        </div>

        {/* Combo */}
        {combo > 1 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-black animate-bounce">
            <Flame className="w-3.5 h-3.5 fill-orange-500" />
            <span>{combo} 连击!</span>
          </div>
        )}

        {/* Score */}
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium mr-1">积分:</span>
          <span className="text-base font-black text-amber-600">{score}</span>
        </div>

        {/* Quit */}
        <button
          onClick={() => {
            if (window.confirm('退出当前闯关吗？')) {
              setGameState('lobby');
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
        >
          放弃
        </button>
      </div>

      {/* Main Game Stage Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm relative">
        {/* Game Mode Title */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            挑战 {currentQIndex + 1} / {questions.length} · 
            {currentQ.type === 'scramble' && ' 字母重组拼词'}
            {currentQ.type === 'balloon_blank' && ' 气球爆破补全'}
            {currentQ.type === 'cloze' && ' 核心词汇辨析'}
          </span>

          <button
            onClick={() => speakWord(currentQ.word.word)}
            className="p-2 rounded-xl bg-amber-100/80 hover:bg-amber-200 text-amber-800 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <Volume2 className="w-4 h-4" />
            <span>读音</span>
          </button>
        </div>

        {/* Clue Area */}
        <div className="text-center py-4">
          <div className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {currentQ.word.translation}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            [{currentQ.word.partOfSpeech}] {currentQ.word.phonetic}
          </div>

          {currentQ.type === 'cloze' && (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 text-slate-700 text-sm">
              <p className="font-semibold">
                {currentQ.word.example.replace(new RegExp(currentQ.word.word, 'gi'), '【 ______ 】')}
              </p>
              <p className="text-xs text-slate-500 mt-1">{currentQ.word.exampleCn}</p>
            </div>
          )}
        </div>

        {/* GAME TYPE 1: SCRAMBLE ASSEMBLY */}
        {currentQ.type === 'scramble' && (
          <div className="mt-4">
            {/* Target Slots (Assembled) */}
            <div className="flex items-center justify-center gap-2 min-h-14 p-3 bg-amber-50/40 rounded-2xl border-2 border-dashed border-amber-200 mb-6 flex-wrap">
              {assembledLetters.length === 0 ? (
                <span className="text-xs text-slate-400">点击下方打乱的字母拼出完整单词</span>
              ) : (
                assembledLetters.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleUndoLetter(item)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-sm flex items-center justify-center transition-transform active:scale-90"
                    title="点击收回"
                  >
                    {item.char}
                  </button>
                ))
              )}
            </div>

            {/* Letter pool */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {availableScrambleLetters.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handlePickLetter(item)}
                  className="w-11 h-11 rounded-2xl bg-white hover:bg-amber-100 active:bg-amber-200 border-2 border-amber-300 text-slate-800 font-black text-lg shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                >
                  {item.char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GAME TYPE 2: BALLOON MISSING LETTER */}
        {currentQ.type === 'balloon_blank' && (
          <div className="mt-4 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-700 tracking-widest my-6">
              {currentQ.blankDisplay}
            </div>

            <p className="text-xs text-slate-500 mb-4">戳破正确的气球字母补齐单词：</p>

            <div className="flex items-center justify-center gap-3">
              {currentQ.options?.map((char, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    playPopSound();
                    if (char.toLowerCase() === currentQ.missingChar?.toLowerCase()) {
                      handleCorrect(120);
                    } else {
                      handleWrong(currentQ.word);
                    }
                  }}
                  className="w-14 h-16 rounded-full bg-linear-to-b from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xl shadow-md shadow-sky-500/20 flex items-center justify-center transition-all hover:-translate-y-1 active:scale-90 border-2 border-white"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GAME TYPE 3: CLOZE / DEFINITION PICKER */}
        {currentQ.type === 'cloze' && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const isRight =
                    opt === currentQ.word.word || opt === currentQ.word.translation;
                  if (isRight) {
                    handleCorrect(100);
                  } else {
                    handleWrong(currentQ.word);
                  }
                }}
                className="p-4 rounded-2xl border-2 border-amber-200/80 hover:border-amber-500 bg-white hover:bg-amber-50/60 font-bold text-slate-800 text-center transition-all hover:scale-[1.02] active:scale-95 shadow-2xs"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
