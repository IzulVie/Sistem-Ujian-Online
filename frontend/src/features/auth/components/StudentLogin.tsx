import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { LogIn, User, ShieldAlert, GraduationCap } from 'lucide-react';

export const StudentLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(username, password);
      if (user.role === 'siswa') {
        navigate('/student/dashboard');
      } else {
        setError('Halaman ini khusus untuk Siswa. Guru dan Admin silakan login melalui halaman Staf.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Kredensial salah atau tidak aktif.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-100/70 dark:bg-[#070a13] transition-colors duration-200 relative">
      
      {/* Theme Toggle Top Right */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-md glass-panel rounded-3xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Decorative subtle glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"></div>

        {/* Title */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-3 border border-indigo-500/20 shadow-sm">
            <GraduationCap className="h-8 w-8 animate-pulse-subtle" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">CBT Ujian Online</h2>
          <p className="text-slate-500 dark:text-gray-400 text-xs mt-1 font-medium">Portal Ujian Mandiri Siswa</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-3 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              NISN / Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-gray-400">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan NISN Anda"
                required
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-gray-400">
                <LogIn className="h-5 w-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <span>Masuk Ujian</span>
                <LogIn className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200 dark:border-white/5 pt-6">
          <button
            onClick={() => navigate('/staff/login')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline transition font-bold"
          >
            Masuk sebagai Guru / Administrator →
          </button>
        </div>
      </div>
    </div>
  );
};
