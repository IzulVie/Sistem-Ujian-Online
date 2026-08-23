import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global event bus for non-React invocation (e.g. Axios interceptors)
export const toast = {
  success: (message: string, title?: string) => {
    window.dispatchEvent(new CustomEvent('cbt:toast', { detail: { message, type: 'success', title } }));
  },
  error: (message: string, title?: string) => {
    window.dispatchEvent(new CustomEvent('cbt:toast', { detail: { message, type: 'error', title } }));
  },
  warning: (message: string, title?: string) => {
    window.dispatchEvent(new CustomEvent('cbt:toast', { detail: { message, type: 'warning', title } }));
  },
  info: (message: string, title?: string) => {
    window.dispatchEvent(new CustomEvent('cbt:toast', { detail: { message, type: 'info', title } }));
  }
};

const toastConfig: Record<ToastType, {
  icon: React.ComponentType<{ className?: string }>;
  border: string;
  bg: string;
  iconColor: string;
  textColor: string;
  badgeBg: string;
  titleDefault: string;
}> = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-500/40 dark:border-emerald-500/30',
    bg: 'bg-emerald-50/95 dark:bg-[#071611]/95 text-emerald-950 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-emerald-800 dark:text-emerald-200/90',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    titleDefault: 'Berhasil'
  },
  error: {
    icon: AlertCircle,
    border: 'border-rose-500/40 dark:border-rose-500/30',
    bg: 'bg-rose-50/95 dark:bg-[#1c080d]/95 text-rose-950 dark:text-rose-100',
    iconColor: 'text-rose-600 dark:text-rose-400',
    textColor: 'text-rose-800 dark:text-rose-200/90',
    badgeBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    titleDefault: 'Terjadi Kesalahan'
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-500/40 dark:border-amber-500/30',
    bg: 'bg-amber-50/95 dark:bg-[#1c1305]/95 text-amber-950 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-800 dark:text-amber-200/90',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    titleDefault: 'Peringatan'
  },
  info: {
    icon: Info,
    border: 'border-indigo-500/40 dark:border-indigo-500/30',
    bg: 'bg-indigo-50/95 dark:bg-[#0c0d1e]/95 text-indigo-950 dark:text-indigo-100',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    textColor: 'text-indigo-800 dark:text-indigo-200/90',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    titleDefault: 'Informasi'
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    title?: string, 
    duration: number = 3800
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, message, type, title, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Listen to window custom events
  useEffect(() => {
    const handleCustomToast = (event: any) => {
      const { message, type, title, duration } = event.detail || {};
      if (message) {
        showToast(message, type, title, duration);
      }
    };

    window.addEventListener('cbt:toast', handleCustomToast);
    return () => window.removeEventListener('cbt:toast', handleCustomToast);
  }, [showToast]);

  const toastMethods = {
    success: (msg: string, title?: string) => showToast(msg, 'success', title),
    error: (msg: string, title?: string) => showToast(msg, 'error', title),
    warning: (msg: string, title?: string) => showToast(msg, 'warning', title),
    info: (msg: string, title?: string) => showToast(msg, 'info', title),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast: toastMethods }}>
      {children}

      {/* Floating Toast Notification Container (Top Right) */}
      <div 
        aria-live="assertive" 
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const config = toastConfig[item.type];
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-2xl p-4 shadow-2xl backdrop-blur-xl border ${config.border} ${config.bg} flex items-start gap-3 transition-all duration-300 animate-slideDown overflow-hidden relative`}
            >
              {/* Left icon badge */}
              <div className={`p-2 rounded-xl shrink-0 ${config.badgeBg} shadow-sm mt-0.5`}>
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>

              {/* Toast content */}
              <div className="flex-1 overflow-hidden pr-2">
                <h5 className="text-xs font-black tracking-tight leading-none text-slate-900 dark:text-white">
                  {item.title || config.titleDefault}
                </h5>
                <p className={`text-xs mt-1 leading-relaxed font-medium ${config.textColor}`}>
                  {item.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(item.id)}
                className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Bottom Subtle Progress countdown bar */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full animate-toast-progress" 
                style={{ animationDuration: `${item.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
