import React from 'react';
import { Clock, Play, Calendar, CheckCircle2 } from 'lucide-react';
import { AvatarStack, AvatarItem } from './AvatarStack';

interface HighlightEventCardProps {
  badgeText?: string;
  title: string;
  subjectName: string;
  subjectCode?: string;
  durationMinutes: number;
  startTime: string;
  participants?: AvatarItem[];
  statusText?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export const HighlightEventCard: React.FC<HighlightEventCardProps> = ({
  badgeText = 'Ujian Hari Ini',
  title,
  subjectName,
  subjectCode,
  durationMinutes,
  startTime,
  participants = [],
  statusText,
  actionLabel = 'Mulai Pengerjaan',
  onAction,
  isLoading = false
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl card-gradient-amber p-6 md:p-7 shadow-xl shadow-amber-500/5 dark:shadow-amber-950/20 border border-amber-300/80 dark:border-amber-500/30">
      {/* Decorative ambient gradient */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        
        {/* Left info */}
        <div className="space-y-3 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-200/90 dark:bg-amber-500/20 border border-amber-400/50 dark:border-amber-400/40 text-amber-900 dark:text-amber-300 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
              <span>{badgeText}</span>
            </span>
            {subjectCode && (
              <span className="text-xs font-mono font-bold text-amber-950 dark:text-gray-400 bg-white/80 dark:bg-white/5 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-white/10">
                {subjectCode}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/80 mt-1 font-semibold">
              Mata Pelajaran: <span className="text-slate-900 dark:text-white font-bold">{subjectName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-gray-300 font-medium pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold">{durationMinutes} Menit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold">{startTime}</span>
            </div>
            {statusText && (
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>{statusText}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Participants + Big Action CTA */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-amber-200 dark:border-white/10">
          {participants.length > 0 && (
            <div className="flex items-center gap-2">
              <AvatarStack avatars={participants} max={4} size="md" />
              <span className="text-[11px] text-slate-700 dark:text-gray-300 font-bold">Terdaftar</span>
            </div>
          )}

          {onAction && (
            <button
              onClick={onAction}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-black text-xs md:text-sm rounded-2xl transition duration-150 shadow-lg shadow-amber-500/20 dark:shadow-amber-950/40 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-gray-950" />
              <span>{actionLabel}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
