import React from 'react';
import { Loader2 } from 'lucide-react';

// 1. Generic Page/Section Spinner with subtle glow
export const PageLoader: React.FC<{ message?: string; height?: string }> = ({ 
  message = 'Memuat data dari server...', 
  height = 'min-h-[45vh]' 
}) => {
  return (
    <div className={`w-full ${height} flex flex-col items-center justify-center p-8 space-y-4`}>
      <div className="relative flex items-center justify-center">
        {/* Glow halo */}
        <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="relative p-3.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-lg">
          <Loader2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">{message}</p>
        <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">Mohon tunggu beberapa saat...</p>
      </div>
    </div>
  );
};

// 2. Card Grid Skeleton (For Question Bank Folders, Exams Grid, Dashboard Cards)
export const CardGridSkeleton: React.FC<{ count?: number; cols?: string }> = ({ 
  count = 4, 
  cols = 'grid-cols-1 md:grid-cols-2' 
}) => {
  return (
    <div className={`grid ${cols} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-white/5 flex flex-col justify-between space-y-4 skeleton-shimmer"
        >
          <div className="space-y-3">
            {/* Header badges */}
            <div className="flex justify-between items-center">
              <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded-lg"></div>
              <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-full"></div>
            </div>

            {/* Title & subtitle */}
            <div className="space-y-2 pt-1">
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-md"></div>
              <div className="h-3.5 w-1/2 bg-slate-100 dark:bg-white/5 rounded-md"></div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-200/80 dark:border-white/5">
              <div className="h-4 bg-slate-200 dark:bg-white/5 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-white/5 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-white/5 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-white/5 rounded"></div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-white/5 flex gap-2">
            <div className="h-9 flex-1 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
            <div className="h-9 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Table Rows Skeleton (For Students, Teachers, Classes, Subjects, Majors)
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 5 
}) => {
  return (
    <div className="w-full glass-panel rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden">
      {/* Table Header placeholder */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center">
        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded"></div>
        <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded"></div>
      </div>

      <div className="divide-y divide-slate-200/70 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4 skeleton-shimmer">
            {Array.from({ length: columns }).map((_, c) => (
              <div 
                key={c} 
                className={`h-4 bg-slate-200 dark:bg-white/10 rounded ${c === 0 ? 'w-1/4' : c === 1 ? 'w-1/3' : 'w-16'}`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Question Item Skeleton (For inside folder / exam session questions)
export const QuestionSkeleton: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4 skeleton-shimmer">
      <div className="flex justify-between items-center">
        <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-lg"></div>
        <div className="h-6 w-28 bg-slate-200 dark:bg-white/10 rounded-full"></div>
      </div>
      <div className="space-y-2 py-2">
        <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded"></div>
        <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded"></div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5"></div>
        <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5"></div>
        <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5"></div>
        <div className="h-10 w-full bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5"></div>
      </div>
    </div>
  );
};

export const QuestionListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <QuestionSkeleton key={i} />
      ))}
    </div>
  );
};

