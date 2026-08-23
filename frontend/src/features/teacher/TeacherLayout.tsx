import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { 
  LayoutDashboard, 
  BookOpen, 
  School, 
  LogOut, 
  Menu, 
  X, 
  FileText, 
  Calendar 
} from 'lucide-react';

export const TeacherLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Bank Soal', path: '/teacher/questions', icon: BookOpen },
    { name: 'Jadwal Ujian', path: '/teacher/exams', icon: Calendar },
    { name: 'Koreksi Manual', path: '/teacher/grading', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100/70 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200 dark:border-white/5 p-5 shrink-0">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="p-2.5 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/25">
            <School className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">CBT Guru</h1>
            <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">Panel Pengajar</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  isActive 
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4 space-y-3">
          {/* Theme switcher */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Tema</span>
            <ThemeToggle compact />
          </div>

          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-8 w-8 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-600 dark:text-cyan-400">
              G
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm font-semibold transition duration-150"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-b border-slate-200 dark:border-white/5 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <School className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">CBT Guru</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 dark:bg-[#070a13]/90 backdrop-blur-md z-20 pt-20 px-4">
          <nav className="space-y-2 glass-panel p-4 rounded-3xl">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive 
                      ? 'bg-cyan-600 text-white' 
                      : 'text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm font-semibold transition"
            >
              <LogOut className="h-5 w-5" />
              <span>Keluar</span>
            </button>
          </nav>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

