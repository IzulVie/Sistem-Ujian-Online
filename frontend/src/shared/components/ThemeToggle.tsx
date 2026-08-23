import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  className = ''
}) => {
  const { themeMode, setThemeMode } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: 'Terang', icon: Sun },
    { mode: 'dark', label: 'Gelap', icon: Moon },
    { mode: 'system', label: 'Laptop', icon: Laptop },
  ];

  if (compact) {
    return (
      <div className={`inline-flex items-center p-1 rounded-2xl bg-gray-200/70 dark:bg-white/5 border border-gray-300/60 dark:border-white/10 ${className}`}>
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = themeMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setThemeMode(mode)}
              title={`Mode ${label}`}
              className={`p-1.5 rounded-xl transition flex items-center justify-center ${
                isActive
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center p-1 rounded-2xl bg-gray-200/70 dark:bg-white/5 border border-gray-300/60 dark:border-white/10 gap-0.5 ${className}`}>
      {options.map(({ mode, label, icon: Icon }) => {
        const isActive = themeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              isActive
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
