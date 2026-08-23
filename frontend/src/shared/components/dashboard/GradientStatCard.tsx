import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export type CardGradientVariant = 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';

interface GradientStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: CardGradientVariant;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

const variantStyles: Record<CardGradientVariant, {
  cardClass: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
}> = {
  indigo: {
    cardClass: 'card-gradient-indigo hover:border-indigo-400/50 shadow-sm dark:shadow-none',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-400/30',
    iconColor: 'text-indigo-600 dark:text-indigo-300',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
  },
  cyan: {
    cardClass: 'card-gradient-cyan hover:border-cyan-400/50 shadow-sm dark:shadow-none',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-400/30',
    iconColor: 'text-cyan-600 dark:text-cyan-300',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
  },
  emerald: {
    cardClass: 'card-gradient-emerald hover:border-emerald-400/50 shadow-sm dark:shadow-none',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-400/30',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
  },
  amber: {
    cardClass: 'card-gradient-amber hover:border-amber-400/50 shadow-sm dark:shadow-none',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-400/30',
    iconColor: 'text-amber-600 dark:text-amber-300',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
  },
  rose: {
    cardClass: 'card-gradient-rose hover:border-rose-400/50 shadow-sm dark:shadow-none',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-400/30',
    iconColor: 'text-rose-600 dark:text-rose-300',
    badgeBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
  },
  purple: {
    cardClass: 'card-gradient-purple hover:border-purple-400/50 shadow-sm dark:shadow-none',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-400/30',
    iconColor: 'text-purple-600 dark:text-purple-300',
    badgeBg: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
  }
};

export const GradientStatCard: React.FC<GradientStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'indigo',
  trend,
  onClick
}) => {
  const styles = variantStyles[variant];

  return (
    <div 
      onClick={onClick}
      className={`rounded-3xl p-5 md:p-6 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${styles.cardClass} ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
            {title}
          </span>
          <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {value}
          </p>
        </div>

        <div className={`p-3 rounded-2xl border ${styles.iconBg} ${styles.iconColor} shrink-0 shadow-sm`}>
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 font-medium">
        <span className="truncate">{subtitle || 'Data terupdate'}</span>

        {trend && (
          <span className={`inline-flex items-center gap-0.5 font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
            trend.isPositive !== false 
              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
              : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
          }`}>
            {trend.isPositive !== false ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
    </div>
  );
};
