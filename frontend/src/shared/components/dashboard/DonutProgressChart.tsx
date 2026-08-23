import React from 'react';

interface DonutItem {
  label: string;
  percentage: number;
  color: string;
  count?: string | number;
}

interface DonutProgressChartProps {
  title: string;
  subtitle?: string;
  primaryPercentage: number;
  centerLabel?: string;
  centerSublabel?: string;
  items?: DonutItem[];
  size?: number;
  strokeWidth?: number;
}

export const DonutProgressChart: React.FC<DonutProgressChartProps> = ({
  title,
  subtitle,
  primaryPercentage,
  centerLabel,
  centerSublabel = 'Tuntas',
  items = [],
  size = 160,
  strokeWidth = 14
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(primaryPercentage, 0), 100);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>

      <div className="my-5 flex flex-col items-center justify-center relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            className="text-slate-200 dark:text-white/5"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active progress stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#donutGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
          {/* Linear gradient definition */}
          <defs>
            <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {centerLabel || `${Math.round(clamped)}%`}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-gray-400 mt-0.5">
            {centerSublabel}
          </span>
        </div>
      </div>

      {/* Legend list */}
      {items.length > 0 && (
        <div className="border-t border-slate-200/80 dark:border-white/5 pt-3 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 dark:text-gray-300 font-semibold">{item.label}</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {item.count ? `${item.count} (${item.percentage}%)` : `${item.percentage}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
