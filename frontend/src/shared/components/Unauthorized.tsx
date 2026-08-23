import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>

        <div className="inline-flex items-center justify-center p-4 bg-red-500/10 text-red-400 rounded-2xl mb-4 border border-red-500/20">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini. Hubungi administrator sistem jika Anda merasa ini adalah kesalahan.
        </p>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-sm font-semibold text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </button>
      </div>
    </div>
  );
};
