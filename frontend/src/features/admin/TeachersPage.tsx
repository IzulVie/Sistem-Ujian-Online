import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { Plus, Edit2, Trash2, X, Users, Search, BookOpen } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface TeacherProfile {
  id: number;
  nip: string;
  subjects: Subject[];
}

interface TeacherUser {
  id: number;
  name: string;
  email: string;
  teacher: TeacherProfile | null;
}

import { useToast } from '../../shared/context/ToastContext';

export const TeachersPage: React.FC = () => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherUser | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nip, setNip] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [teachersRes, subjectsRes] = await Promise.all([
        apiClient.get('/admin/teachers'),
        apiClient.get('/admin/subjects')
      ]);
      setTeachers(teachersRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setEmail('');
    setPassword('');
    setNip('');
    setSelectedSubjectIds([]);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (teacher: TeacherUser) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setEmail(teacher.email);
    setPassword('');
    setNip(teacher.teacher?.nip || '');
    setSelectedSubjectIds(teacher.teacher?.subjects.map((s) => s.id) || []);
    setError(null);
    setModalOpen(true);
  };

  const handleSubjectToggle = (subjectId: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: any = {
      name,
      email,
      nip,
      subject_ids: selectedSubjectIds
    };

    if (password) {
      payload.password = password;
    } else if (!editingTeacher) {
      setError('Password wajib diisi untuk guru baru.');
      setLoading(false);
      return;
    }

    try {
      if (editingTeacher) {
        await apiClient.put(`/admin/teachers/${editingTeacher.id}`, payload);
        toast.success('Data guru berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/teachers', payload);
        toast.success('Guru baru berhasil ditambahkan!');
      }
      fetchData();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data guru.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus guru ini beserta akunnya?')) return;
    try {
      await apiClient.delete(`/admin/teachers/${id}`);
      toast.success('Data guru berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus guru.');
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.teacher?.nip && t.teacher.nip.includes(search))
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <Users className="h-6 w-6" />
            </div>
            <span>Manajemen Guru & Pengajar</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Kelola akun guru beserta penugasan mata pelajaran CBT.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Guru</span>
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
            placeholder="Cari nama, email, atau NIP guru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
          />
        </div>
      </div>

      {/* Table or Skeleton */}
      {loadingData ? (
        <TableSkeleton rows={5} columns={4} />
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">NIP</th>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">Mata Pelajaran Diampu</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-sm text-slate-700 dark:text-gray-300 font-medium">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300 text-xs font-bold">
                        {t.teacher?.nip || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">{t.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {t.teacher?.subjects && t.teacher.subjects.length > 0 ? (
                            t.teacher.subjects.map((sub) => (
                              <span
                                key={sub.id}
                                className="px-2.5 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 text-xs font-bold rounded-lg"
                              >
                                {sub.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 dark:text-gray-500 text-xs italic">Belum ada mata pelajaran</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(t)}
                          className="inline-flex p-2 hover:bg-indigo-50 dark:hover:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-xl transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
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
                      Tidak ada data guru yang cocok dengan pencarian.
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
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">
              {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-semibold shrink-0">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Nama Lengkap (Gelar)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    NIP (Nomor Induk Pegawai)
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan NIP guru"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="budi@sekolah.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Kata Sandi {editingTeacher && '(Kosongkan jika tidak diubah)'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required={!editingTeacher}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              {/* Subject Mapping Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Pilih Mata Pelajaran diampu
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl max-h-44 overflow-y-auto">
                  {subjects.length > 0 ? (
                    subjects.map((sub) => (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 px-2.5 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-medium cursor-pointer select-none text-slate-800 dark:text-gray-300 shadow-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.includes(sub.id)}
                          onChange={() => handleSubjectToggle(sub.id)}
                          className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span className="truncate" title={sub.name}>
                          {sub.code} — {sub.name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-xs text-slate-500 dark:text-gray-500 py-4 flex flex-col items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>Belum ada data mata pelajaran. Buat terlebih dahulu di menu Mapel.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5 shrink-0">
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
