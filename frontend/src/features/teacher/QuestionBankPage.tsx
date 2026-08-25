import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { QuestionForm } from './components/QuestionForm';
import { QuestionImportModal } from './components/QuestionImportModal';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { CardGridSkeleton, QuestionListSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Plus, Edit2, Trash2, Search, Upload, Eye, 
  X, Folder, FolderPlus, Copy, ArrowLeft, Layers, CheckCircle, FileText, ChevronRight
} from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface QuestionPackage {
  id: number;
  teacher_id: number;
  subject_id: number;
  code: string;
  title: string;
  description: string | null;
  total_questions: number;
  questions_count?: number;
  created_at: string;
  subject: Subject;
}

interface Question {
  id: number;
  package_id: number | null;
  subject_id: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  content: string;
  media_url: string | null;
  explanation: string | null;
  subject: Subject;
  options: Array<{ id: number; content: string; is_correct: boolean; media_url: string | null }>;
  matching_pairs: Array<{ id: number; left_item: string; right_item: string }>;
}

export const QuestionBankPage: React.FC = () => {
  const { toast } = useToast();

  // Navigation level: 'packages' (Folder list) or 'package_detail' (Questions inside selected package)
  const [currentView, setCurrentView] = useState<'packages' | 'package_detail'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<QuestionPackage | null>(null);

  // Data states
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Modals
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<QuestionPackage | null>(null);
  const [packageTitle, setPackageTitle] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [packageSubjectName, setPackageSubjectName] = useState('');
  const [packageDescription, setPackageDescription] = useState('');

  const [formActive, setFormActive] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [targetImportPackageId, setTargetImportPackageId] = useState<number | null>(null);
  const [previewingQuestion, setPreviewingQuestion] = useState<Question | null>(null);

  // Fetch Packages & Subjects
  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const [packagesRes, subjectsRes] = await Promise.all([
        apiClient.get('/teacher/packages'),
        apiClient.get('/teacher/subjects')
      ]);
      setPackages(packagesRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Fetch questions for selected package
  const fetchPackageQuestions = async (packageId: number) => {
    setLoadingQuestions(true);
    try {
      const res = await apiClient.get(`/teacher/questions?package_id=${packageId}`);
      setQuestions(res.data);
    } catch (err) {
      console.error('Failed to load package questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // Open a specific package
  const handleOpenPackage = (pkg: QuestionPackage) => {
    setSelectedPackage(pkg);
    setCurrentView('package_detail');
    setSearch('');
    fetchPackageQuestions(pkg.id);
  };

  // Back to packages list
  const handleBackToPackages = () => {
    setCurrentView('packages');
    setSelectedPackage(null);
    setFormActive(false);
    setActiveQuestionId(null);
    setPreviewingQuestion(null);
    fetchPackages();
  };

  // CRUD Package handlers
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageTitle('');
    setPackageCode('');
    setPackageSubjectName('');
    setPackageDescription('');
    setPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: QuestionPackage) => {
    setEditingPackage(pkg);
    setPackageTitle(pkg.title);
    setPackageCode(pkg.code);
    setPackageSubjectName(pkg.subject?.name || '');
    setPackageDescription(pkg.description || '');
    setPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPackage) {
        await apiClient.put(`/teacher/packages/${editingPackage.id}`, {
          title: packageTitle,
          code: packageCode,
          subject_name: packageSubjectName,
          description: packageDescription,
        });
        toast.success('Berkas paket soal berhasil diperbarui!');
      } else {
        await apiClient.post('/teacher/packages', {
          title: packageTitle,
          code: packageCode,
          subject_name: packageSubjectName,
          description: packageDescription,
        });
        toast.success('Berkas paket soal baru berhasil dibuat!');
      }
      setPackageModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan berkas paket.');
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm('Peringatan: Menghapus berkas paket ini akan menghapus seluruh butir soal di dalamnya! Apakah Anda yakin?')) return;
    try {
      await apiClient.delete(`/teacher/packages/${id}`);
      toast.success('Berkas paket soal berhasil dihapus!');
      fetchPackages();
      if (currentView === 'package_detail' && selectedPackage?.id === id) {
        handleBackToPackages();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus paket.');
    }
  };

  const handleDuplicatePackage = async (id: number) => {
    try {
      const res = await apiClient.post(`/teacher/packages/${id}/duplicate`);
      toast.success(`Berhasil menduplikasi paket: ${res.data.data.title}`);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menduplikasi paket.');
    }
  };

  // CRUD Question inside Package handlers
  const handleCreateQuestionSuccess = () => {
    setFormActive(false);
    setActiveQuestionId(null);
    if (selectedPackage) {
      fetchPackageQuestions(selectedPackage.id);
      fetchPackages();
    }
  };

  const handleEditQuestion = (id: number) => {
    setActiveQuestionId(id);
    setFormActive(true);
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus butir soal ini dari paket?')) return;
    try {
      await apiClient.delete(`/teacher/questions/${id}`);
      toast.success('Butir soal berhasil dihapus dari paket!');
      if (selectedPackage) {
        fetchPackageQuestions(selectedPackage.id);
        fetchPackages();
      }
      if (previewingQuestion?.id === id) {
        setPreviewingQuestion(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus soal.');
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold rounded-lg">Mudah</span>;
      case 'medium':
        return <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-semibold rounded-lg">Sedang</span>;
      case 'hard':
        return <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold rounded-lg">Sulit</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice_single':
        return 'Pilihan Ganda (Single)';
      case 'multiple_choice_multi':
        return 'Pilihan Ganda (Kompleks)';
      case 'essay':
        return 'Essay / Uraian';
      case 'true_false':
        return 'Benar / Salah';
      case 'matching':
        return 'Menjodohkan';
      default:
        return type;
    }
  };

  // Filtered packages
  const filteredPackages = packages.filter(pkg => {
    const matchSearch = pkg.title.toLowerCase().includes(search.toLowerCase()) || 
                        pkg.code.toLowerCase().includes(search.toLowerCase()) ||
                        (pkg.description && pkg.description.toLowerCase().includes(search.toLowerCase()));
    const matchSubject = subjectFilter ? pkg.subject_id.toString() === subjectFilter : true;
    return matchSearch && matchSubject;
  });

  // Filtered questions inside selected package
  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(search.toLowerCase()) || 
                        q.topic.toLowerCase().includes(search.toLowerCase());
    const matchDifficulty = difficultyFilter ? q.difficulty === difficultyFilter : true;
    return matchSearch && matchDifficulty;
  });

  const totalAllQuestions = packages.reduce((acc, p) => acc + (p.questions_count ?? p.total_questions ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {currentView === 'package_detail' && selectedPackage ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackToPackages}
                className="p-2.5 glass-panel hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition shadow-xs"
                title="Kembali ke Daftar Berkas"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400 font-bold mb-1">
                  <span>Bank Soal</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-slate-800 dark:text-white">{selectedPackage.subject?.name}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/30">
                    <Folder className="h-6 w-6" />
                  </div>
                  <span>{selectedPackage.title}</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">
                    {selectedPackage.code}
                  </span>
                </h1>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/30">
                  <Layers className="h-6 w-6" />
                </div>
                <span>Bank Soal (Berkas & Paket)</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
                Kelola butir soal dalam berkas paket terpisah agar tidak bercampur dan siap digunakan pada ujian.
              </p>
            </div>
          )}
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          {currentView === 'packages' ? (
            <>
              <button
                onClick={() => {
                  setTargetImportPackageId(null);
                  setImportOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleOpenCreatePackage}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Buat Berkas Baru</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setTargetImportPackageId(selectedPackage?.id || null);
                  setImportOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Import CSV ke Berkas Ini</span>
              </button>
              <button
                onClick={() => {
                  setActiveQuestionId(null);
                  setFormActive(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Butir Soal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DAFTAR BERKAS / PAKET SOAL (FOLDER VIEW)                          */}
      {/* ========================================================================= */}
      {currentView === 'packages' && (
        <div className="space-y-6">
          {/* Quick Stats & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-3xl shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-200 dark:border-cyan-500/20">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Berkas</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{packages.length} Paket</p>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-3xl shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Butir Soal</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{totalAllQuestions} Butir</p>
              </div>
            </div>

            {/* Filter Search */}
            <div className="md:col-span-2 glass-panel p-2.5 rounded-3xl shadow-sm flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama berkas, kode, atau catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 glass-input rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
                />
              </div>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3.5 py-2 glass-input rounded-xl text-xs text-slate-900 dark:text-white bg-white dark:bg-[#0f172a] font-medium"
              >
                <option value="">Semua Mata Pelajaran</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Package Grid or Loading Skeleton */}
          {loadingPackages ? (
            <CardGridSkeleton count={6} cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
          ) : filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
              {filteredPackages.map((pkg) => {
                const questionCount = pkg.questions_count ?? pkg.total_questions ?? 0;
                return (
                  <div
                    key={pkg.id}
                    className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 flex flex-col justify-between group card-interactive"
                  >
                    <div>
                      {/* Badge Top */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20 text-xs font-bold rounded-lg">
                          {pkg.subject?.name || 'Umum'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                          {pkg.code}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h3 
                        onClick={() => handleOpenPackage(pkg)}
                        className="text-base font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition cursor-pointer mb-2 line-clamp-1"
                      >
                        {pkg.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 min-h-[32px] mb-4 font-medium">
                        {pkg.description || 'Tidak ada deskripsi berkas.'}
                      </p>

                      {/* Question Count Pill */}
                      <div className="flex items-center gap-2 mb-4 p-2.5 bg-slate-100 dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/5">
                        <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 dark:text-gray-300">
                          <strong className="text-slate-900 dark:text-white font-bold">{questionCount}</strong> Butir Soal Terkunci
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenPackage(pkg)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-600/20 btn-press"
                      >
                        <Folder className="h-3.5 w-3.5" />
                        <span>Buka Berkas</span>
                      </button>

                      <button
                        onClick={() => handleDuplicatePackage(pkg.id)}
                        className="p-2.5 bg-slate-100 hover:bg-cyan-100 dark:bg-white/5 dark:hover:bg-cyan-600/20 text-slate-600 hover:text-cyan-700 dark:text-gray-400 dark:hover:text-cyan-400 border border-slate-200 dark:border-white/10 rounded-xl transition shadow-xs btn-press"
                        title="Duplikasi Berkas Paket"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-xl transition shadow-xs btn-press"
                        title="Edit Berkas"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-2.5 bg-slate-100 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-600/20 text-slate-600 hover:text-rose-700 dark:text-gray-400 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 rounded-xl transition shadow-xs btn-press"
                        title="Hapus Berkas"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel text-center py-16 text-slate-500 dark:text-gray-500 rounded-3xl shadow-sm">
              <FolderPlus className="h-12 w-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-300 mb-1">Belum Ada Berkas Paket Soal</h3>
              <p className="text-xs text-slate-500 dark:text-gray-500 max-w-md mx-auto mb-4 font-medium">
                Buat berkas paket soal baru atau import file CSV agar butir-butir soal tersimpan rapi dan terisolasi.
              </p>
              <button
                onClick={handleOpenCreatePackage}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Buat Berkas Sekarang</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: BUTIR SOAL DI DALAM PAKET TERPILIH (PACKAGE DETAIL VIEW)          */}
      {/* ========================================================================= */}
      {currentView === 'package_detail' && selectedPackage && (
        <div className="space-y-6">
          {/* Question Form View */}
          {formActive ? (
            <div className="glass-panel p-6 md:p-8 rounded-3xl shadow-xl">
              <QuestionForm
                questionId={activeQuestionId}
                packageId={selectedPackage.id}
                defaultSubjectId={selectedPackage.subject_id}
                onSuccess={handleCreateQuestionSuccess}
                onCancel={() => {
                  setFormActive(false);
                  setActiveQuestionId(null);
                }}
              />
            </div>
          ) : (
            <>
              {/* Package Summary & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-200 dark:border-cyan-500/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Daftar Butir Soal ({filteredQuestions.length} Butir)</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Seluruh soal di bawah ini terikat eksklusif pada berkas: <strong className="text-slate-800 dark:text-gray-200">{selectedPackage.title}</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="h-4 w-4 text-slate-400 dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari konten atau topik..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 glass-input rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
                    />
                  </div>

                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="px-3.5 py-2 glass-input rounded-xl text-xs text-slate-900 dark:text-white bg-white dark:bg-[#0f172a] font-medium"
                  >
                    <option value="">Semua Tingkat</option>
                    <option value="easy">Mudah</option>
                    <option value="medium">Sedang</option>
                    <option value="hard">Sulit</option>
                  </select>
                </div>
              </div>

              {/* Questions List or Skeleton */}
              {loadingQuestions ? (
                <QuestionListSkeleton count={4} />
              ) : filteredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {filteredQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-2.5">
                          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 font-bold rounded-lg text-xs">
                            No. {idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 text-xs font-bold rounded-lg">
                            {getTypeLabel(q.type)}
                          </span>
                          {getDifficultyBadge(q.difficulty)}
                          <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                            Topik: <strong className="text-slate-800 dark:text-gray-200 font-bold">{q.topic}</strong>
                          </span>
                        </div>

                        {/* Content (LaTeX rendered) */}
                        <div className="text-slate-900 dark:text-white text-sm font-medium leading-relaxed mb-3">
                          <LaTeXRenderer text={q.content} />
                        </div>

                        {/* Media Attachment if available */}
                        {q.media_url && (
                          <div className="mb-3">
                            <img
                              src={q.media_url}
                              alt="Media Soal"
                              className="max-h-40 rounded-2xl border border-slate-200 dark:border-white/10 object-contain shadow-xs"
                            />
                          </div>
                        )}

                        {/* Options preview for MCQ */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-white/5">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={opt.id || oIdx}
                                className={`text-xs p-2.5 rounded-xl flex items-center gap-2 border ${
                                  opt.is_correct
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-white/[0.02] dark:border-white/5 dark:text-gray-400'
                                }`}
                              >
                                <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-transparent">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <div className="truncate">
                                  <LaTeXRenderer text={opt.content} />
                                </div>
                                {opt.is_correct && (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Matching pairs preview */}
                        {q.matching_pairs && q.matching_pairs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.matching_pairs.map((mp, mIdx) => (
                              <div key={mp.id || mIdx} className="text-xs p-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl text-slate-800 dark:text-gray-300 flex items-center justify-between font-medium">
                                <span>{mp.left_item}</span>
                                <span className="text-slate-400 dark:text-gray-500 mx-2 font-bold">➔</span>
                                <span className="text-cyan-700 dark:text-cyan-400 font-bold">{mp.right_item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start">
                        <button
                          onClick={() => setPreviewingQuestion(q)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition"
                          title="Preview Soal"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuestion(q.id)}
                          className="p-2 hover:bg-cyan-50 dark:hover:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl transition"
                          title="Edit Soal"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 rounded-xl transition"
                          title="Hapus Soal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel text-center py-16 text-slate-500 dark:text-gray-500 rounded-3xl shadow-sm">
                  <FileText className="h-10 w-10 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-gray-300 mb-1">Berkas Paket Ini Masih Kosong</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-500 max-w-md mx-auto mb-4 font-medium">
                    Tambahkan butir soal atau import file CSV langsung ke dalam berkas ini.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setFormActive(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Butir Soal</span>
                    </button>
                    <button
                      onClick={() => {
                        setTargetImportPackageId(selectedPackage.id);
                        setImportOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Import File CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BUAT / EDIT BERKAS PAKET SOAL                                      */}
      {/* ========================================================================= */}
      {packageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setPackageModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-200 dark:border-cyan-500/20">
                <FolderPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingPackage ? 'Edit Berkas Paket Soal' : 'Buat Berkas Paket Soal Baru'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Berkas ini akan menampung butir-butir soal secara terisolasi.</p>
              </div>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Nama / Judul Berkas Paket *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Paket UTS Matematika Wajib Kelas X"
                  value={packageTitle}
                  onChange={(e) => setPackageTitle(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ketik mata pelajaran (cth: Matematika Wajib)"
                    value={packageSubjectName}
                    onChange={(e) => setPackageSubjectName(e.target.value)}
                    list="subject-suggestions"
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                  <datalist id="subject-suggestions">
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Kode Berkas (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PKT-MTK-10"
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Catatan / Deskripsi Berkas
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan tambahan untuk berkas paket ini..."
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setPackageModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-cyan-600/30"
                >
                  Simpan Berkas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORT CSV                                                         */}
      {/* ========================================================================= */}
      {importOpen && (
        <QuestionImportModal
          packageId={targetImportPackageId}
          onSuccess={() => {
            fetchPackages();
            if (selectedPackage) {
              fetchPackageQuestions(selectedPackage.id);
            }
          }}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW SOAL                                                       */}
      {/* ========================================================================= */}
      {previewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewingQuestion(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20 text-xs font-bold rounded-lg">
                {getTypeLabel(previewingQuestion.type)}
              </span>
              {getDifficultyBadge(previewingQuestion.difficulty)}
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                Topik: <strong className="text-slate-900 dark:text-gray-200 font-bold">{previewingQuestion.topic}</strong>
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/5 mb-4 text-slate-900 dark:text-white text-base leading-relaxed font-medium">
              <LaTeXRenderer text={previewingQuestion.content} />
            </div>

            {previewingQuestion.media_url && (
              <div className="mb-4">
                <img
                  src={previewingQuestion.media_url}
                  alt="Media Soal"
                  className="max-h-60 rounded-2xl border border-slate-200 dark:border-white/10 object-contain mx-auto shadow-xs"
                />
              </div>
            )}

            {previewingQuestion.options && previewingQuestion.options.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider">Opsi Pilihan Jawaban:</p>
                {previewingQuestion.options.map((opt, idx) => (
                  <div
                    key={opt.id || idx}
                    className={`p-3 rounded-2xl flex items-center justify-between border text-sm ${
                      opt.is_correct
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-white/[0.02] dark:border-white/5 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-transparent">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <LaTeXRenderer text={opt.content} />
                    </div>
                    {opt.is_correct && <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </div>
                ))}
              </div>
            )}

            {previewingQuestion.explanation && (
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300">
                <p className="font-bold text-indigo-700 dark:text-indigo-200 mb-1">Pembahasan Soal:</p>
                <LaTeXRenderer text={previewingQuestion.explanation} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
