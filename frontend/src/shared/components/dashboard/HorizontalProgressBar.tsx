import React from 'react';

export interface ProgressItem {
  id: string | number;
  label: string;
  sublabel?: string;
  percentage: number;
  colorClass?: string;
  badgeText?: string;
}

interface HorizontalProgressBarProps {
  title: string;
  subtitle?: string;
  items: ProgressItem[];
  maxItems?: number;
}

export const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  title,
  subtitle,
  items = [],
  maxItems
}) => {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>

      <div className="space-y-3.5">
        {displayItems.length > 0 ? (
          displayItems.map((item) => {
            const clamped = Math.min(Math.max(item.percentage, 0), 100);
            const gradient = item.colorClass || 'from-indigo-500 to-cyan-400';

            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-gray-200">{item.label}</span>
                    {item.sublabel && (
                      <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">• {item.sublabel}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badgeText && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-bold">
                        {item.badgeText}
                      </span>
                    )}
                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs">{clamped}%</span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="h-2.5 w-full bg-slate-200/70 dark:bg-white/[0.04] border border-slate-300/50 dark:border-white/5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
                    style={{ width: `${clamped}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-500 dark:text-gray-500 py-3 text-center">Belum ada data progress</p>
        )}
      </div>
    </div>
  );
};
