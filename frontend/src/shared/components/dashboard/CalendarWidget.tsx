import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export interface HighlightDate {
  date: string; // YYYY-MM-DD
  title: string;
  type?: 'exam' | 'submission' | 'event';
}

interface CalendarWidgetProps {
  highlights?: HighlightDate[];
  onSelectDate?: (date: Date) => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  highlights = [],
  onSelectDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isHighlighted = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return highlights.find(h => h.date === formatted);
  };

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none">
              {monthNames[month]} {year}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 font-medium">Jadwal Ujian Aktif</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
        {daysShort.map((d, idx) => (
          <div key={idx} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const todayActive = isToday(day);
          const event = isHighlighted(day);

          return (
            <button
              key={day}
              onClick={() => onSelectDate && onSelectDate(new Date(year, month, day))}
              className={`h-8 w-8 mx-auto rounded-xl flex flex-col items-center justify-center font-bold transition relative text-xs ${
                todayActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : event
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{day}</span>
              {event && !todayActive && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500 dark:bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Upcoming events preview */}
      {highlights.length > 0 && (
        <div className="border-t border-slate-200/80 dark:border-white/5 pt-3 space-y-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-gray-400">Ujian Mendatang:</p>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {highlights.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl">
                <span className="font-semibold text-slate-800 dark:text-white truncate max-w-[140px]">{item.title}</span>
                <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-md">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
