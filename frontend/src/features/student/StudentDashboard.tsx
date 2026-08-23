import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { LogOut, GraduationCap, User, BookOpen, Layers } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto flex flex-col justify-center">
      <div className="glass-panel rounded-2xl shadow-xl p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-indigo-400" />
              Portal Siswa
            </h1>
            <p className="text-gray-400 text-sm mt-1">Selamat datang kembali, {user?.name}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition active:scale-95 shadow-md"
          >
            <LogOut className="h-4 w-4" />
            Keluar Sesi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-xl flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400">Profil Siswa</h3>
              <p className="text-lg font-bold text-white mt-1">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-1">NISN: {user?.username}</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-xl flex items-start gap-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400">Kelas & Jurusan</h3>
              <p className="text-lg font-bold text-white mt-1">
                {user?.profile?.class_room?.name || 'XII RPL 1'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Jurusan: {user?.profile?.major?.name || 'Rekayasa Perangkat Lunak'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-xl">
          <BookOpen className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Tidak ada Ujian Aktif</h3>
          <p className="text-sm text-gray-400 mt-1">Belum ada paket ujian yang dijadwalkan untuk Anda saat ini.</p>
        </div>
      </div>
    </div>
  );
};
