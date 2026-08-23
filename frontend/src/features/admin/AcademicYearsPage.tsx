import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { Plus, Edit2, Trash2, X, Calendar, Check } from 'lucide-react';

interface AcademicYear {
  id: number;
  name: string;
  semester: 'odd' | 'even';
  is_active: boolean;
}

import { useToast } from '../../shared/context/ToastContext';

export const AcademicYearsPage: React.FC = () => {
  const { toast } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  const [name, setName] = useState('');
  const [semester, setSemester] = useState<'odd' | 'even'>('odd');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAcademicYears = async () => {
    setLoadingData(true);
    try {
      const response = await apiClient.get('/admin/academic-years');
      setAcademicYears(response.data);
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const openAddModal = () => {
    setEditingYear(null);
    setName('');
    setSemester('odd');
    setIsActive(false);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setName(year.name);
    setSemester(year.semester);
    setIsActive(year.is_active);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name,
      semester,
      is_active: isActive
    };

    try {
      if (editingYear) {
        await apiClient.put(`/admin/academic-years/${editingYear.id}`, payload);
        toast.success('Data tahun ajaran berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/academic-years', payload);
        toast.success('Tahun ajaran baru berhasil ditambahkan!');
      }
      fetchAcademicYears();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data tahun ajaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tahun ajaran ini?')) return;
    try {
      await apiClient.delete(`/admin/academic-years/${id}`);
      toast.success('Tahun ajaran berhasil dihapus!');
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tahun ajaran.');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await apiClient.post(`/admin/academic-years/${id}/activate`);
      toast.success('Tahun ajaran berhasil diaktifkan!');
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengaktifkan tahun ajaran.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <Calendar className="h-6 w-6" />
            </div>
            <span>Tahun Ajaran & Semester</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Atur tahun ajaran aktif dan semester pengerjaan ujian sebagai sumber referensi utama.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Tahun Ajaran</span>
        </button>
      </div>

      {/* Table or Skeleton */}
      {loadingData ? (
        <TableSkeleton rows={3} columns={4} />
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Tahun Ajaran</th>
                  <th className="px-6 py-4">Semester</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-sm text-slate-700 dark:text-gray-300 font-medium">
                {academicYears.length > 0 ? (
                  academicYears.map((year) => (
                    <tr key={year.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{year.name}</td>
                      <td className="px-6 py-4 capitalize font-semibold text-slate-800 dark:text-gray-200">
                        {year.semester === 'odd' ? 'Ganjil (Odd)' : 'Genap (Even)'}
                      </td>
                      <td className="px-6 py-4">
                        {year.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-xs font-bold rounded-lg shadow-xs">
                            <Check className="h-3.5 w-3.5" />
                            Aktif (Aktif Berjalan)
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-500 text-xs font-medium">Tidak Aktif</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        {!year.is_active && (
                          <button
                            onClick={() => handleActivate(year.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl transition"
                          >
                            Aktifkan
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(year)}
                          className="inline-flex p-2 hover:bg-indigo-50 dark:hover:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-xl transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(year.id)}
                          disabled={year.is_active}
                          className="inline-flex p-2 hover:bg-rose-50 dark:hover:bg-white/5 text-rose-600 dark:text-rose-400 disabled:opacity-30 rounded-xl transition"
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
                      Belum ada data tahun ajaran.
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
              {editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2025/2026, 2026/2027"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as 'odd' | 'even')}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                >
                  <option value="odd">Ganjil (Odd)</option>
                  <option value="even">Genap (Even)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="isActiveCheck" className="text-sm font-bold text-slate-800 dark:text-gray-300 cursor-pointer">
                  Set sebagai semester aktif saat ini
                </label>
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
