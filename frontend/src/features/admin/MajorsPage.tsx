import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { Plus, Edit2, Trash2, X, School, Search } from 'lucide-react';

interface Major {
  id: number;
  name: string;
  code: string;
}

import { useToast } from '../../shared/context/ToastContext';

export const MajorsPage: React.FC = () => {
  const { toast } = useToast();
  const [majors, setMajors] = useState<Major[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMajors = async () => {
    setLoadingData(true);
    try {
      const response = await apiClient.get('/admin/majors');
      setMajors(response.data);
    } catch (err) {
      console.error('Failed to fetch majors:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchMajors();
  }, []);

  const openAddModal = () => {
    setEditingMajor(null);
    setName('');
    setCode('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (major: Major) => {
    setEditingMajor(major);
    setName(major.name);
    setCode(major.code);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editingMajor) {
        await apiClient.put(`/admin/majors/${editingMajor.id}`, { name, code });
        toast.success('Data jurusan berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/majors', { name, code });
        toast.success('Jurusan baru berhasil ditambahkan!');
      }
      fetchMajors();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jurusan ini?')) return;
    try {
      await apiClient.delete(`/admin/majors/${id}`);
      toast.success('Data jurusan berhasil dihapus!');
      fetchMajors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus jurusan.');
    }
  };

  const filteredMajors = majors.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <School className="h-6 w-6" />
            </div>
            <span>Manajemen Jurusan</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Kelola data program studi/jurusan konsentrasi keahlian sekolah.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Jurusan</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex justify-between items-center glass-panel p-4 rounded-3xl shadow-sm">
        <div className="relative w-full max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Cari nama atau kode jurusan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
          />
        </div>
      </div>

      {/* Table or Skeleton */}
      {loadingData ? (
        <TableSkeleton rows={4} columns={3} />
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Kode Jurusan</th>
                  <th className="px-6 py-4">Nama Jurusan</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-sm text-slate-700 dark:text-gray-300 font-medium">
                {filteredMajors.length > 0 ? (
                  filteredMajors.map((major) => (
                    <tr key={major.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-xs rounded-lg">
                          {major.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{major.name}</td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(major)}
                          className="inline-flex p-2 hover:bg-indigo-50 dark:hover:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-xl transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(major.id)}
                          className="inline-flex p-2 hover:bg-rose-50 dark:hover:bg-white/5 text-rose-600 dark:text-rose-400 rounded-xl transition"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 font-medium">
                      Tidak ada data jurusan ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              {editingMajor ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Kode Jurusan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RPL, TKJ, MM"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Nama Jurusan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rekayasa Perangkat Lunak"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center shadow-lg shadow-indigo-600/30"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
