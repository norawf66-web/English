import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Volume2, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  ArrowRight, 
  Play, 
  Award, 
  BookOpen, 
  Shuffle, 
  CornerDownLeft,
  Volume1,
  BookmarkPlus,
  Zap
} from 'lucide-react';
import { VocabularyWord, BookSemester, MistakeItem } from '../types';
import { VOCABULARY_LIST, UNIT_METAS } from '../data/vocabularyData';
import { playCorrectSound, playErrorSound, playWinSound, playPopSound, speakWord } from '../utils/audio';
import { recordMistake } from '../utils/storage';

interface SpellingTestProps {
  activeBook: BookSemester | 'ALL';
  onMistakeAdded: (mistakes: MistakeItem[]) => void;
  onGoToMistakes: () => void;
  onRecordTestCompleted: (correctCount: number, totalCount: number) => void;
}

type TestType = 'cn2en' | 'listening' | 'cloze';

export const SpellingTest: React.FC<SpellingTestProps> = ({
  activeBook,
  onMistakeAdded,
  onGoToMistakes,
  onRecordTestCompleted,
}) => {
  // Setup state
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [testType, setTestType] = useState<TestType>('cn2en');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isStarted, setIsStarted] = useState<boolean>(false);

  // Active test state
  const [quizList, setQuizList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [revealedHint, setRevealedHint] = useState<boolean>(false);
  const [testHistory, setTestHistory] = useState<{
    word: VocabularyWord;
    userAnswer: string;
    isCorrect: boolean;
  }[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Available units filtered by active book
  const filteredUnits = UNIT_METAS.filter(
    (u) => activeBook === 'ALL' || u.book === activeBook
  );

  // Filter word bank
  const getEligibleWords = (): VocabularyWord[] => {
    let pool = VOCABULARY_LIST;
    if (activeBook !== 'ALL') {
      pool = pool.filter((w) => w.book === activeBook);
    }
    if (selectedUnitId !== 'all') {
      const [book, uStr] = selectedUnitId.split('-U');
      const uNum = parseInt(uStr, 10);
      pool = pool.filter((w) => w.book === book && w.unit === uNum);
    }
    return pool;
  };

  const startTest = () => {
    const pool = getEligibleWords();
    if (pool.length === 0) return;

    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const count = Math.min(questionCount, shuffled.length);
    const selected = shuffled.slice(0, count);

    setQuizList(selected);
    setCurrentIndex(0);
    setUserInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setRevealedHint(false);
    setTestHistory([]);
    setIsCompleted(false);
    setIsStarted(true);

    // If listening test, play voice immediately
    if (testType === 'listening') {
      setTimeout(() => {
        speakWord(selected[0].word);
      }, 350);
    }
  };

  const currentWord = quizList[currentIndex];

  useEffect(() => {
    if (isStarted && !isCompleted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isStarted, isCompleted, isAnswered]);

  const handlePronounce = (slow = false) => {
    if (!currentWord) return;
    speakWord(currentWord.word, slow);
  };

  const cleanString = (str: string) =>
    str.toLowerCase().trim().replace(/\s+/g, ' ');

  const handleSubmitAnswer = () => {
    if (!currentWord || isAnswered) return;

    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    const target = cleanString(currentWord.word);
    const user = cleanString(trimmedInput);
    const correct = target === user;

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      playCorrectSound();
      speakWord(currentWord.word);
    } else {
      playErrorSound();
      // Automatically add into mistakes notebook
      const updatedMistakes = recordMistake(currentWord, trimmedInput);
      onMistakeAdded(updatedMistakes);
    }

    setTestHistory((prev) => [
      ...prev,
      {
        word: currentWord,
        userAnswer: trimmedInput,
        isCorrect: correct,
      },
    ]);
  };

  const handleNextWord = () => {
    if (currentIndex + 1 < quizList.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setUserInput('');
      setIsAnswered(false);
      setIsCorrect(false);
      setRevealedHint(false);

      if (testType === 'listening') {
        setTimeout(() => {
          speakWord(quizList[nextIdx].word);
        }, 300);
      }
    } else {
      // Test finished
      finishTest();
    }
  };

  const finishTest = () => {
    setIsCompleted(true);
    const correctCount = testHistory.filter((h) => h.isCorrect).length + (isCorrect ? 1 : 0);
    const totalCount = quizList.length;

    onRecordTestCompleted(correctCount, totalCount);

    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    if (accuracy >= 80) {
      playWinSound();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  // Keyboard Enter support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!isAnswered) {
        handleSubmitAnswer();
      } else {
        handleNextWord();
      }
    }
  };

  // Helper letter tiles click
  const handleLetterClick = (char: string) => {
    if (isAnswered) return;
    playPopSound();
    setUserInput((prev) => prev + char);
  };

  const handleBackspace = () => {
    if (isAnswered) return;
    setUserInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isAnswered) return;
    setUserInput('');
  };

  // ===================== RENDER TEST SETUP VIEW =====================
  if (!isStarted) {
    const availablePool = getEligibleWords();

    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm relative overflow-hidden">
          {/* Decorative badge */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                课后单词拼写与听写自测
              </h2>
              <p className="text-sm text-slate-500">
                紧扣2026年人教版PEP英语教材词汇表，错题自动收集，即时查漏补缺
              </p>
            </div>
          </div>

          {/* Unit selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              1. 选择测试课本单元
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              <button
                id="unit-pick-all"
                onClick={() => setSelectedUnitId('all')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedUnitId === 'all'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-extrabold text-amber-600">综合复习</div>
                <div className="text-sm font-bold truncate">
                  {activeBook === 'ALL' ? '全部五年级词汇' : `${activeBook} 全册综合`}
                </div>
              </button>

              {filteredUnits.map((u) => (
                <button
                  key={u.id}
                  id={`unit-pick-${u.id}`}
                  onClick={() => setSelectedUnitId(u.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedUnitId === u.id
                      ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold shadow-xs'
                      : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-400">
                    {u.book} - Unit {u.unit}
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={u.title}>
                    {u.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{u.topic}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Test mode selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              2. 选择测试模式
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                id="mode-pick-cn2en"
                onClick={() => setTestType('cn2en')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  testType === 'cn2en'
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 shadow-xs'
                    : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-800">看中文默写</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-700 font-bold">
                    标准模式
                  </span>
                </div>
                <p className="text-xs text-slate-500">根据中文释义与词性，拼写出正确的英文单词</p>
              </button>

              <button
                id="mode-pick-listening"
                onClick={() => setTestType('listening')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  testType === 'listening'
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 shadow-xs'
                    : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-800">听发音拼写</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                    听力特训
                  </span>
                </div>
                <p className="text-xs text-slate-500">点击纯正美音发音，训练听觉辨音并准确拼写</p>
              </button>

              <button
                id="mode-pick-cloze"
                onClick={() => setTestType('cloze')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  testType === 'cloze'
                    ? 'border-orange-500 bg-orange-50/60 text-orange-950 shadow-xs'
                    : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-800">首字母填空</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                    阶梯提示
                  </span>
                </div>
                <p className="text-xs text-slate-500">提供首字母与单词长度下划线提示，适合打牢基础</p>
              </button>
            </div>
          </div>

          {/* Question count */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">
                3. 本次测试题量
              </label>
              <span className="text-xs text-slate-500">
                当前可选词库：共 <strong className="text-amber-600 font-black">{availablePool.length}</strong> 词
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  id={`count-pick-${num}`}
                  onClick={() => setQuestionCount(num)}
                  disabled={availablePool.length < num && num > 5}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    questionCount === num
                      ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                  }`}
                >
                  {num} 题
                </button>
              ))}
              <button
                id="count-pick-max"
                onClick={() => setQuestionCount(availablePool.length)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  questionCount === availablePool.length
                    ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                }`}
              >
                全部 ({availablePool.length}题)
              </button>
            </div>
          </div>

          {/* Start CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>测试中答错的生词将自动归集到「错题智能本」，可随时重练！</span>
            </div>

            <button
              id="start-test-btn"
              onClick={startTest}
              disabled={availablePool.length === 0}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 text-base transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>开始单词拼写自测</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== RENDER TEST SUMMARY / REPORT =====================
  if (isCompleted) {
    const correctCount = testHistory.filter((h) => h.isCorrect).length;
    const totalCount = quizList.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const wrongItems = testHistory.filter((h) => !h.isCorrect);

    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm">
          {/* Header result */}
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-100/80 text-amber-600 mb-3 shadow-inner">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">
              {accuracy === 100
                ? '太棒了！满分王者！🎉'
                : accuracy >= 80
                ? '成绩优异！继续加油！🌟'
                : '测试完成，抓紧巩固错题吧！💪'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              本次人教版课后拼写测试总计 {totalCount} 题
            </p>

            {/* Score pill */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="text-center">
                <div className="text-3xl font-black text-amber-600">{accuracy}%</div>
                <div className="text-xs font-semibold text-slate-400">正确率</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-600">{correctCount}</div>
                <div className="text-xs font-semibold text-slate-400">拼写正确</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-black text-rose-500">{wrongItems.length}</div>
                <div className="text-xs font-semibold text-slate-400">错题收录</div>
              </div>
            </div>
          </div>

          {/* Mistake notice */}
          {wrongItems.length > 0 && (
            <div className="my-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-900">
                    已自动收集 {wrongItems.length} 个拼写错题至错题本
                  </div>
                  <div className="text-xs text-rose-600">
                    系统已记录您的错误拼写，建议立即在错题消灭营中进行巩固练习
                  </div>
                </div>
              </div>
              <button
                id="view-mistakes-from-test"
                onClick={onGoToMistakes}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
              >
                前往错题消灭营
              </button>
            </div>
          )}

          {/* List of tested words */}
          <div className="mt-6">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">本次测试答题明细</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {testHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    item.isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">{item.word.word}</span>
                        <span className="text-xs text-slate-400 font-mono">{item.word.phonetic}</span>
                        <span className="text-xs text-slate-500">[{item.word.partOfSpeech}]</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        释义：{item.word.translation}
                      </div>
                      {!item.isCorrect && (
                        <div className="text-xs text-rose-600 mt-0.5 font-mono">
                          您的拼写: <span className="line-through">{item.userAnswer || '未填写'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => speakWord(item.word.word)}
                    className="p-2 rounded-xl bg-white text-slate-600 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-colors"
                    title="朗读"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
            <button
              id="retest-btn"
              onClick={startTest}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新测试</span>
            </button>
            <button
              id="back-setup-btn"
              onClick={() => setIsStarted(false)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 transition-all"
            >
              返回单元选关
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== RENDER ACTIVE TEST IN-PROGRESS =====================
  const progressPercent = Math.round(((currentIndex + 1) / quizList.length) * 100);

  // Split target word for cloze hint
  const wordLetters = currentWord.word.split('');
  const hintDisplay = wordLetters
    .map((char, i) => {
      if (char === ' ' || char === '-') return char;
      if (i === 0 || revealedHint) return char;
      return '_';
    })
    .join(' ');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Test progress bar */}
      <div className="mb-4 bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-amber-200/60 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold">
            第 {currentIndex + 1} / {quizList.length} 题
          </span>
          <span className="text-xs text-slate-500 font-medium truncate max-w-[150px] sm:max-w-none">
            {currentWord.unitTitle}
          </span>
        </div>

        {/* Progress meter */}
        <div className="w-32 sm:w-48 bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-linear-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <button
          onClick={() => {
            if (window.confirm('确定要退出当前测试吗？未完成进度将不会保存。')) {
              setIsStarted(false);
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
        >
          退出
        </button>
      </div>

      {/* Main Flashcard Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm relative">
        {/* Unit & Type badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {currentWord.book} - Unit {currentWord.unit}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePronounce(false)}
              className="p-2 rounded-xl bg-amber-100/70 hover:bg-amber-200 text-amber-800 transition-colors flex items-center gap-1 text-xs font-bold"
              title="正常语速朗读"
            >
              <Volume2 className="w-4 h-4" />
              <span>发音</span>
            </button>
            <button
              onClick={() => handlePronounce(true)}
              className="p-2 rounded-xl bg-orange-100/70 hover:bg-orange-200 text-orange-800 transition-colors flex items-center gap-1 text-xs font-bold"
              title="慢速跟读"
            >
              <Volume1 className="w-4 h-4" />
              <span>慢速</span>
            </button>
          </div>
        </div>

        {/* Question content */}
        <div className="text-center py-4">
          {/* In listening mode, hide translation initially or show partial */}
          {testType === 'listening' && !isAnswered ? (
            <div className="py-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                <Volume2 className="w-8 h-8" />
              </div>
              <p className="text-slate-700 font-bold text-base">请仔细听单词发音并拼写</p>
              <button
                onClick={() => handlePronounce(false)}
                className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
              >
                没有听清？点击重新播放
              </button>
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
                {currentWord.translation}
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-mono mb-2">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-sans text-xs">
                  {currentWord.partOfSpeech}
                </span>
                <span>{currentWord.phonetic}</span>
              </div>
            </>
          )}

          {/* Cloze or letter hints */}
          {(testType === 'cloze' || revealedHint || isAnswered) && (
            <div className="my-3 font-mono text-lg font-bold tracking-widest text-amber-700 bg-amber-50/70 py-2 px-4 rounded-xl border border-amber-200 inline-block">
              {isAnswered ? currentWord.word : hintDisplay}
            </div>
          )}

          {/* Example sentence with blank */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-600">
            <p className="font-medium text-slate-700">
              例句：
              {isAnswered
                ? currentWord.example
                : currentWord.example.replace(new RegExp(currentWord.word, 'gi'), '_______')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{currentWord.exampleCn}</p>
          </div>
        </div>

        {/* Input box */}
        <div className="mt-4">
          <div className="relative">
            <input
              ref={inputRef}
              id="spelling-input"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              disabled={isAnswered}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在此输入英文单词拼写..."
              className={`w-full text-center text-lg sm:text-xl font-bold py-3.5 px-4 rounded-2xl border-2 transition-all outline-hidden ${
                isAnswered
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-rose-500 bg-rose-50 text-rose-900'
                  : 'border-amber-300 focus:border-amber-500 bg-white focus:ring-3 focus:ring-amber-200'
              }`}
            />
          </div>

          {/* On-screen letter keys for tablets/children */}
          {!isAnswered && (
            <div className="mt-3">
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                {'abcdefghijklmnopqrstuvwxyz'.split('').map((ch) => (
                  <button
                    key={ch}
                    onClick={() => handleLetterClick(ch)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50/80 hover:bg-amber-100 active:bg-amber-200 text-slate-800 text-xs font-bold border border-amber-200/80 transition-colors shadow-2xs"
                  >
                    {ch}
                  </button>
                ))}
                <button
                  onClick={() => handleLetterClick(' ')}
                  className="px-3 h-7 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
                >
                  空格
                </button>
                <button
                  onClick={() => handleLetterClick('-')}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
                >
                  -
                </button>
                <button
                  onClick={handleBackspace}
                  className="px-2 h-7 sm:h-8 rounded-lg bg-rose-100/70 hover:bg-rose-200 text-rose-700 text-xs font-bold border border-rose-200"
                >
                  退格
                </button>
                <button
                  onClick={handleClear}
                  className="px-2 h-7 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold"
                >
                  清空
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Section if answered */}
        {isAnswered && (
          <div
            className={`mt-4 p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="font-black text-sm">
                  {isCorrect ? '拼写完全正确！Great Job!' : '拼写错误，已自动收录至错题本！'}
                </div>
                {!isCorrect && (
                  <div className="text-xs mt-0.5">
                    正确拼写是：<strong className="text-emerald-700 font-mono text-sm">{currentWord.word}</strong>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNextWord}
              id="next-word-btn"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            >
              <span>{currentIndex + 1 < quizList.length ? '下一题' : '查看报告'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action button row if not answered */}
        {!isAnswered && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setRevealedHint(true)}
              disabled={revealedHint}
              className="px-3 py-2 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-50 border border-amber-200 flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{revealedHint ? '提示已展开' : '查看首字母提示'}</span>
            </button>

            <button
              id="submit-answer-btn"
              onClick={handleSubmitAnswer}
              disabled={!userInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-40 active:scale-95"
            >
              <span>确认提交</span>
              <CornerDownLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
