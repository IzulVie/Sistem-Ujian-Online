import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { Plus, Edit2, Trash2, X, GraduationCap, Search } from 'lucide-react';

interface Major {
  id: number;
  name: string;
  code: string;
}

interface ClassRoom {
  id: number;
  name: string;
  level: number;
  major_id: number | null;
  major: Major | null;
}

export const ClassesPage: React.FC = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  const [name, setName] = useState('');
  const [level, setLevel] = useState(10);
  const [majorId, setMajorId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [classesRes, majorsRes] = await Promise.all([
        apiClient.get('/admin/classes'),
        apiClient.get('/admin/majors')
      ]);
      setClasses(classesRes.data);
      setMajors(majorsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data kelas.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setName('');
    setLevel(10);
    setMajorId('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (cls: ClassRoom) => {
    setEditingClass(cls);
    setName(cls.name);
    setLevel(cls.level);
    setMajorId(cls.major_id ? cls.major_id.toString() : '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name,
      level,
      major_id: majorId ? parseInt(majorId) : null,
    };

    try {
      if (editingClass) {
        await apiClient.put(`/admin/classes/${editingClass.id}`, payload);
        toast.success('Data kelas berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/classes', payload);
        toast.success('Kelas baru berhasil ditambahkan!');
      }
      fetchData();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data kelas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;
    try {
      await apiClient.delete(`/admin/classes/${id}`);
      toast.success('Data kelas berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kelas.');
    }
  };

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(search.toLowerCase()) ||
      (cls.major?.name && cls.major.name.toLowerCase().includes(search.toLowerCase())) ||
      (cls.major?.code && cls.major.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span>Manajemen Kelas</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Konfigurasi data rombel kelas dan tingkat tingkatan sekolah.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kelas</span>
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
            placeholder="Cari kelas atau jurusan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
          />
        </div>
      </div>

      {/* Table or Skeleton */}
      {loadingData ? (
        <TableSkeleton rows={4} columns={4} />
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Tingkat (Level)</th>
                  <th className="px-6 py-4">Nama Kelas</th>
                  <th className="px-6 py-4">Jurusan</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-sm text-slate-700 dark:text-gray-300 font-medium">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">Tingkat {cls.level}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{cls.name}</td>
                      <td className="px-6 py-4">
                        {cls.major ? (
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 text-xs font-bold rounded-lg">
                            {cls.major.code} — {cls.major.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-500 text-xs font-medium">Umum / Tanpa Jurusan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(cls)}
                          className="inline-flex p-2 hover:bg-indigo-50 dark:hover:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-xl transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls.id)}
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
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 font-medium">
                      Tidak ada data kelas ditemukan.
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
              {editingClass ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII RPL 1, X TKJ 2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Tingkat (Level)
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                >
                  <option value={10}>10 (Sepuluh)</option>
                  <option value={11}>11 (Sebelas)</option>
                  <option value={12}>12 (Duabelas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Jurusan (Opsional)
                </label>
                <select
                  value={majorId}
                  onChange={(e) => setMajorId(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                >
                  <option value="">-- Tanpa Jurusan (Umum) --</option>
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.code} — {major.name}
                    </option>
                  ))}
                </select>
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
