import React from 'react';
import { 
  X, 
  Award, 
  Star, 
  Flame, 
  BookOpen, 
  Target, 
  Compass, 
  MapPin, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Achievement, UserStats } from '../types';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  stats: UserStats;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
  stats,
}) => {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-6 h-6" />;
      case 'Flame':
        return <Flame className="w-6 h-6" />;
      case 'BookOpen':
        return <BookOpen className="w-6 h-6" />;
      case 'Target':
        return <Target className="w-6 h-6" />;
      case 'MapPin':
        return <MapPin className="w-6 h-6" />;
      case 'Star':
        return <Star className="w-6 h-6" />;
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-amber-200 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 font-black">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">
              学习成就与荣誉勋章
            </h3>
            <p className="text-xs text-slate-500">
              已解锁 {unlockedCount} / {achievements.length} 个荣誉勋章
            </p>
          </div>
        </div>

        {/* Student Stats overview */}
        <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 mb-6 text-center">
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">连续坚持</div>
            <div className="text-base font-black text-orange-600">{stats.streakDays} 天</div>
          </div>
          <div className="border-x border-amber-200">
            <div className="text-[11px] text-slate-500 font-semibold">拼写正确</div>
            <div className="text-base font-black text-emerald-600">{stats.totalCorrectWords} 词</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">金星总数</div>
            <div className="text-base font-black text-amber-600">{stats.starsCount} 颗</div>
          </div>
        </div>

        {/* Badges list */}
        <div className="overflow-y-auto space-y-3 pr-1">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                ach.unlocked
                  ? 'bg-linear-to-r from-amber-50/60 to-purple-50/40 border-amber-300 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  ach.unlocked
                    ? 'bg-linear-to-tr from-amber-400 to-orange-400 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {getIcon(ach.icon)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-extrabold text-slate-800 text-sm truncate">
                    {ach.title}
                  </h4>
                  {ach.unlocked ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      已获得
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {ach.progress}/{ach.maxProgress}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">{ach.description}</p>

                {/* Progress bar if not unlocked */}
                {!ach.unlocked && (
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm transition-colors"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
