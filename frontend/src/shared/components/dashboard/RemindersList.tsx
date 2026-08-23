import React from 'react';
import { Bell, AlertCircle, Info, CheckCircle2, ShieldAlert, ChevronRight } from 'lucide-react';

export interface ReminderItem {
  id: string | number;
  title: string;
  description?: string;
  timeAgo: string;
  type?: 'info' | 'warning' | 'success' | 'danger';
  onClick?: () => void;
}

interface RemindersListProps {
  title?: string;
  reminders: ReminderItem[];
  emptyMessage?: string;
}

const typeIcons = {
  info: { icon: Info, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' },
  warning: { icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  success: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  danger: { icon: ShieldAlert, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' }
};

export const RemindersList: React.FC<RemindersListProps> = ({
  title = 'Pengingat & Aktivitas',
  reminders = [],
  emptyMessage = 'Belum ada notifikasi baru'
}) => {
  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
            <Bell className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none">{title}</h4>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-white/10">
          {reminders.length} Baru
        </span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto">
        {reminders.length > 0 ? (
          reminders.map((item) => {
            const style = typeIcons[item.type || 'info'];
            const Icon = style.icon;

            return (
              <div
                key={item.id}
                onClick={item.onClick}
                className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  item.onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-white/20 hover:bg-slate-100/60 dark:hover:bg-white/[0.03]' : ''
                } bg-slate-50 dark:bg-white/[0.01] border-slate-200/70 dark:border-white/5`}
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <div className={`p-1.5 rounded-xl border ${style.bg} ${style.color} shrink-0 mt-0.5`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</h5>
                    {item.description && (
                      <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    )}
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono mt-1 block">
                      {item.timeAgo}
                    </span>
                  </div>
                </div>

                {item.onClick && (
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-gray-500 shrink-0 self-center" />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-slate-500 dark:text-gray-500 text-xs font-medium">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};
