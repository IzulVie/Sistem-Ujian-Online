import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Plus, Edit2, Trash2, Calendar, Clock, Settings, Users, 
  BookOpen, AlertCircle, X, Search, Folder, CheckCircle, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface QuestionPackage {
  id: number;
  code: string;
  title: string;
  subject_id: number;
  total_questions: number;
  questions_count?: number;
  subject?: Subject;
}

interface Question {
  id: number;
  package_id?: number | null;
  topic: string;
  type: string;
  content: string;
}

export interface ExamGroup {
  id: number;
  name: string;
  token: string;
  start_time: string;
  end_time: string;
}

interface Exam {
  id: number;
  title: string;
  package_id?: number | null;
  subject_id: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  settings: {
    allow_backtrack: boolean;
    allow_flag: boolean;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_result_immediately: boolean;
    max_tab_switches?: number;
  };
  kkm_score: number;
  status: string;
  subject?: Subject;
  package?: QuestionPackage;
  questions?: any[];
  exam_groups?: ExamGroup[];
}

export const ExamsPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  // Toggle Forms
  const [modalOpen, setModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [activeExamForGroup, setActiveExamForGroup] = useState<Exam | null>(null);

  // Exam Form States
  const [title, setTitle] = useState('');
  const [packageId, setPackageId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [kkmScore, setKkmScore] = useState(75);
  const [status, setStatus] = useState<'draft' | 'published' | 'closed'>('draft');
  
  // Settings States
  const [allowBacktrack, setAllowBacktrack] = useState(true);
  const [allowFlag, setAllowFlag] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResultImmediately, setShowResultImmediately] = useState(false);
  const [maxTabSwitches, setMaxTabSwitches] = useState(5);

  // Selected Questions with weights & Manual selection accordion
  const [selectedQuestions, setSelectedQuestions] = useState<Array<{ id: number; weight: number }>>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [showManualQuestionPicker, setShowManualQuestionPicker] = useState(false);

  // Group Form States
  const [groupName, setGroupName] = useState('');
  const [groupStartTime, setGroupStartTime] = useState('');
  const [groupEndTime, setGroupEndTime] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoadingExams(true);
    try {
      const [examsRes, packagesRes, subjectsRes, questionsRes, studentsRes, classesRes] = await Promise.all([
        apiClient.get('/teacher/exams'),
        apiClient.get('/teacher/packages'),
        apiClient.get('/teacher/subjects'),
        apiClient.get('/teacher/questions'),
        apiClient.get('/teacher/students'),
        apiClient.get('/teacher/classes'),
      ]);
      setExams(examsRes.data);
      setPackages(packagesRes.data);
      setSubjects(subjectsRes.data);
      setAllQuestions(questionsRes.data);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error('Failed to load exams data:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingExam(null);
    setTitle('');
    const defaultPkg = packages[0];
    if (defaultPkg) {
      setPackageId(defaultPkg.id.toString());
      setSubjectId(defaultPkg.subject_id.toString());
      // Pre-select questions from default package
      const pkgQuestions = allQuestions.filter(q => q.package_id === defaultPkg.id);
      setSelectedQuestions(pkgQuestions.map(q => ({ id: q.id, weight: 2 })));
    } else {
      setPackageId('');
      setSubjectId(subjects[0]?.id.toString() || '');
      setSelectedQuestions([]);
    }
    setDurationMinutes(90);
    setStartTime('');
    setEndTime('');
    setKkmScore(75);
    setStatus('draft');
    setAllowBacktrack(true);
    setAllowFlag(true);
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setShowResultImmediately(false);
    setMaxTabSwitches(5);
    setShowManualQuestionPicker(false);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = async (exam: Exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setPackageId(exam.package_id ? exam.package_id.toString() : '');
    setSubjectId(exam.subject_id.toString());
    setDurationMinutes(exam.duration_minutes);
    setStartTime(new Date(exam.start_time).toISOString().substring(0, 16));
    setEndTime(new Date(exam.end_time).toISOString().substring(0, 16));
    setKkmScore(exam.kkm_score);
    setStatus(exam.status as 'draft' | 'published' | 'closed');
    
    // Settings
    setAllowBacktrack(exam.settings.allow_backtrack);
    setAllowFlag(exam.settings.allow_flag);
    setShuffleQuestions(exam.settings.shuffle_questions);
    setShuffleOptions(exam.settings.shuffle_options);
    setShowResultImmediately(exam.settings.show_result_immediately);
    setMaxTabSwitches(exam.settings.max_tab_switches ?? 5);

    // Get mapped questions details
    try {
      const res = await apiClient.get(`/teacher/exams/${exam.id}`);
      const detailedQuestions = res.data.questions || [];
      setSelectedQuestions(detailedQuestions.map((q: any) => ({
        id: q.id,
        weight: q.pivot?.weight || 2
      })));
    } catch (err) {
      console.error('Failed to load detailed questions for exam edit:', err);
    }

    setShowManualQuestionPicker(false);
    setError(null);
    setModalOpen(true);
  };

  // When package selection changes in form
  const handlePackageChange = (newPackageId: string) => {
    setPackageId(newPackageId);
    if (!newPackageId) return;

    const selectedPkg = packages.find(p => p.id.toString() === newPackageId);
    if (selectedPkg) {
      setSubjectId(selectedPkg.subject_id.toString());
      if (!title || title.startsWith('Ujian:')) {
        setTitle(`Ujian: ${selectedPkg.title}`);
      }
      // Auto-assign all questions from this package
      const pkgQuestions = allQuestions.filter(q => q.package_id === selectedPkg.id);
      setSelectedQuestions(pkgQuestions.map(q => ({ id: q.id, weight: 2 })));
    }
  };

  const toggleQuestionSelection = (id: number) => {
    setSelectedQuestions(prev => {
      const exists = prev.some(q => q.id === id);
      if (exists) {
        return prev.filter(q => q.id !== id);
      } else {
        return [...prev, { id, weight: 2 }];
      }
    });
  };

  const handleWeightChange = (id: number, weight: number) => {
    setSelectedQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, weight } : q)
    );
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      package_id: packageId ? Number(packageId) : null,
      subject_id: Number(subjectId),
      duration_minutes: durationMinutes,
      start_time: startTime,
      end_time: endTime,
      kkm_score: kkmScore,
      status,
      settings: {
        allow_backtrack: allowBacktrack,
        allow_flag: allowFlag,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        show_result_immediately: showResultImmediately,
        max_tab_switches: maxTabSwitches
      },
      questions: selectedQuestions
    };

    try {
      if (editingExam) {
        await apiClient.put(`/teacher/exams/${editingExam.id}`, payload);
        toast.success('Konfigurasi ujian berhasil diperbarui!');
      } else {
        await apiClient.post('/teacher/exams', payload);
        toast.success('Jadwal ujian baru berhasil dibuat!');
      }
      fetchData();
      setModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan konfigurasi ujian.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus paket ujian ini? Semua data pengerjaan siswa akan hilang.')) return;
    try {
      await apiClient.delete(`/teacher/exams/${id}`);
      toast.success('Paket ujian berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus ujian.');
    }
  };

  // Group / Wave Management
  const openGroupModal = (exam: Exam) => {
    setActiveExamForGroup(exam);
    setGroupName('');
    setGroupStartTime(new Date(exam.start_time).toISOString().substring(0, 16));
    setGroupEndTime(new Date(exam.end_time).toISOString().substring(0, 16));
    setSelectedClassIds([]);
    setSelectedStudentIds([]);
    setGroupModalOpen(true);
  };

  const handleToggleClass = (classId: number) => {
    const isSelected = selectedClassIds.includes(classId);
    const newSelectedClassIds = isSelected 
      ? selectedClassIds.filter(id => id !== classId)
      : [...selectedClassIds, classId];
    
    setSelectedClassIds(newSelectedClassIds);

    // Sync corresponding student IDs automatically
    const classStudentIds = students
      .filter(s => s.student?.class_id === classId || s.student?.class_room_id === classId)
      .map(s => s.student?.id)
      .filter(Boolean);

    if (isSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !classStudentIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...classStudentIds])));
    }
  };

  const handleSelectAllClasses = () => {
    const allClassIds = classes.map(c => c.id);
    setSelectedClassIds(allClassIds);
    const allStudentIds = students.map(s => s.student?.id).filter(Boolean);
    setSelectedStudentIds(allStudentIds);
  };

  const handleClearAllClasses = () => {
    setSelectedClassIds([]);
    setSelectedStudentIds([]);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExamForGroup) return;

    if (selectedStudentIds.length === 0 && selectedClassIds.length === 0) {
      toast.warning('Silakan pilih minimal 1 kelas atau siswa untuk sesi ujian ini.');
      return;
    }

    setLoading(true);
    const payload = {
      exam_id: activeExamForGroup.id,
      name: groupName,
      start_time: groupStartTime,
      end_time: groupEndTime,
      class_ids: selectedClassIds,
      student_ids: selectedStudentIds
    };

    try {
      await apiClient.post('/teacher/exam-groups', payload);
      toast.success('Sesi gelombang ujian baru berhasil dibuat!');
      fetchData();
      setGroupModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat sesi gelombang.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Hapus sesi gelombang ini?')) return;
    try {
      await apiClient.delete(`/teacher/exam-groups/${groupId}`);
      toast.success('Sesi gelombang berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus sesi.');
    }
  };

  const selectedPackageObj = packages.find(p => p.id.toString() === packageId);
  const filteredQuestionsList = allQuestions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(questionSearch.toLowerCase()) || 
                        q.topic.toLowerCase().includes(questionSearch.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/30">
              <Calendar className="h-6 w-6" />
            </div>
            <span>Manajemen Paket Ujian</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
            Buat jadwal ujian instan dengan memilih berkas paket soal dan atur gelombang sesi pengerjaan siswa.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Jadwal Ujian Baru</span>
        </button>
      </div>

      {/* Grid of Exams or Skeleton */}
      {loadingExams ? (
        <CardGridSkeleton count={4} cols="grid-cols-1 lg:grid-cols-2" />
      ) : exams.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="glass-panel rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-white/10 flex flex-col justify-between card-interactive"
            >
              <div>
                {/* Header tags */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20 text-xs font-bold rounded-lg">
                      {exam.subject?.name || 'Umum'}
                    </span>
                    {exam.package && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/5 text-[11px] font-bold rounded-md flex items-center gap-1">
                        <Folder className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                        <span>{exam.package.title}</span>
                      </span>
                    )}
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    exam.status === 'published' 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30' 
                      : exam.status === 'closed'
                      ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
                      : 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30'
                  }`}>
                    {exam.status}
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">{exam.title}</h2>

                {/* Info Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-200 dark:border-white/5 mb-4 text-xs text-slate-600 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>{exam.duration_minutes} Menit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{exam.questions?.length ?? 0} Soal Terpasang</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>KKM: {exam.kkm_score}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{new Date(exam.start_time).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>

                {/* Waves & Sessional Groups Section */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Gelombang Sesi ({exam.exam_groups?.length || 0})</span>
                    </span>
                    <button
                      onClick={() => openGroupModal(exam)}
                      className="text-[11px] text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold flex items-center gap-1 transition btn-press"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Tambah Sesi</span>
                    </button>
                  </div>

                  {exam.exam_groups && exam.exam_groups.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {exam.exam_groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-gray-300 font-medium"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white mr-2">{group.name}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 rounded font-bold">
                              Sesi Aktif
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg btn-press"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-gray-500 italic bg-slate-50 dark:bg-white/[0.01] p-2.5 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 font-medium">
                      Belum ada gelombang sesi. Buat sesi untuk mengatur jadwal & siswa peserta.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex gap-2">
                <button
                  onClick={() => navigate('/teacher/reports')}
                  className="flex-1 flex justify-center items-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold transition shadow-xs btn-press"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Laporan</span>
                </button>
                <button
                  onClick={() => openEditModal(exam)}
                  className="flex-1 flex justify-center items-center gap-1.5 py-2.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-600/10 dark:hover:bg-cyan-600/20 border border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 rounded-xl text-xs font-bold transition shadow-xs btn-press"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteExam(exam.id)}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/10 dark:hover:bg-rose-600/20 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold transition shadow-xs btn-press"
                  title="Hapus Ujian"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel text-center py-16 text-slate-500 dark:text-gray-500 rounded-3xl shadow-sm">
          <Calendar className="h-10 w-10 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800 dark:text-gray-300">Belum ada paket ujian terjadwal.</p>
        </div>
      )}

      {/* CRUD Add/Edit Exam Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-4xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2.5">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/20">
                <Calendar className="h-5 w-5" />
              </div>
              <span>{editingExam ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian Baru'}</span>
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs shrink-0 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleExamSubmit} className="space-y-6 overflow-y-auto pr-1 flex-1 flex flex-col min-h-0">
              
              {/* STEP 1: PILIH BERKAS PAKET SOAL (1-KLIK) */}
              <div className="p-4 bg-cyan-50 dark:bg-indigo-950/20 border border-cyan-200 dark:border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  <label className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Pilih Berkas / Paket Soal Ujian *
                  </label>
                </div>

                <select
                  value={packageId}
                  required
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                >
                  <option value="">-- Pilih Berkas Paket Soal --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      [{pkg.code}] {pkg.title} — ({pkg.questions_count ?? pkg.total_questions ?? 0} Soal - {pkg.subject?.name})
                    </option>
                  ))}
                </select>

                {selectedPackageObj && (
                  <div className="p-3 bg-emerald-50 dark:bg-green-500/10 border border-emerald-200 dark:border-green-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-green-300 font-medium">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-green-400 shrink-0" />
                    <span>
                      Berkas <strong>{selectedPackageObj.title}</strong> siap digunakan! Sebanyak <strong>{selectedQuestions.length} butir soal</strong> terisolasi akan otomatis diujikan.
                    </span>
                  </div>
                )}
              </div>

              {/* Core Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Judul Jadwal Ujian *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Penilaian Harian Matematika Aljabar"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Mata Pelajaran *</label>
                  <select
                    value={subjectId}
                    required
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timings and KKM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Durasi (Menit) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Mulai Akses *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Batas Akses *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              {/* Anti-Cheat & Exam Rules Settings */}
              <div className="p-4 bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl space-y-3 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider block">Pengaturan Anti-Cheat & Aturan Pengerjaan</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowBacktrack}
                      onChange={(e) => setAllowBacktrack(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <span>Boleh Kembali ke Soal Sebelumnya (Backtrack)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowFlag}
                      onChange={(e) => setAllowFlag(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <span>Boleh Menandai Soal Ragu-ragu</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <span>Acak Urutan Soal (Shuffle)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <span>Acak Pilihan Opsi Jawaban</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showResultImmediately}
                      onChange={(e) => setShowResultImmediately(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                    <span>Tampilkan Hasil Langsung (Instant Score)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-gray-400 font-medium">Batas Pindah Tab:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={maxTabSwitches}
                      onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                      className="w-16 px-2 py-1 glass-input rounded-lg text-slate-900 dark:text-white text-xs text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Status Ujian */}
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider">Status Ujian:</span>
                <div className="flex gap-2">
                  {['draft', 'published', 'closed'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                        status === s 
                          ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm' 
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-400'
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional: Manual Question Inspection / Fine-Tuning Accordion */}
              <div className="border border-slate-200 dark:border-white/5 rounded-2xl p-4 bg-slate-50 dark:bg-[#090d16] space-y-3">
                <button
                  type="button"
                  onClick={() => setShowManualQuestionPicker(!showManualQuestionPicker)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Lihat / Kustomisasi Butir Soal Terpilih ({selectedQuestions.length} Soal Terpasang)</span>
                  </span>
                  {showManualQuestionPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showManualQuestionPicker && (
                  <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-3">
                    <div className="relative w-full">
                      <Search className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari konten atau topik..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 glass-input rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
                      />
                    </div>

                    <div className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-y-auto max-h-52 p-2.5 space-y-2 bg-white dark:bg-[#060911]">
                      {filteredQuestionsList.map((q) => {
                        const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                        const currentSq = selectedQuestions.find(sq => sq.id === q.id);

                        return (
                          <div
                            key={q.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                              isSelected 
                                ? 'bg-cyan-50 border-cyan-200 text-slate-900 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-white/[0.01] dark:border-white/5 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/[0.02]'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuestionSelection(q.id)}
                                className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5"
                              />
                              <div className="truncate text-xs font-medium">
                                <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-gray-400 text-[9px] font-bold rounded mr-1.5 uppercase">{q.type}</span>
                                <span className="text-slate-600 dark:text-gray-400 font-bold mr-1">[{q.topic}]</span>
                                <LaTeXRenderer text={q.content} />
                              </div>
                            </label>

                            {isSelected && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Bobot:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={currentSq?.weight || 2}
                                  onChange={(e) => handleWeightChange(q.id, Number(e.target.value))}
                                  className="w-12 px-1.5 py-0.5 glass-input rounded text-xs text-center text-slate-900 dark:text-white font-bold"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition shadow-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedQuestions.length === 0}
                  className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center shadow-lg shadow-cyan-600/30"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Simpan Jadwal Ujian</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add Sessional Group/Wave Modal */}
      {groupModalOpen && activeExamForGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setGroupModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/20">
                <Users className="h-5 w-5" />
              </div>
              <span>Tambah Gelombang Sesi Baru</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 font-medium">
              Konfigurasi wave pengerjaan dan mapping siswa untuk ujian: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{activeExamForGroup.title}</span>
            </p>

            <form onSubmit={handleGroupSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Nama Gelombang / Sesi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sesi 1 Pagi (Kelas RPL 1)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Mulai Pengerjaan Sesi</label>
                  <input
                    type="datetime-local"
                    required
                    value={groupStartTime}
                    onChange={(e) => setGroupStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">Selesai Pengerjaan Sesi</label>
                  <input
                    type="datetime-local"
                    required
                    value={groupEndTime}
                    onChange={(e) => setGroupEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              {/* Class-Based Batch Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Pilih Kelas Peserta (Target Rombel)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-bold hover:underline"
                    >
                      Pilih Semua Kelas
                    </button>
                    <span className="text-slate-300 dark:text-white/20">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllClasses}
                      className="text-slate-500 hover:text-slate-700 dark:text-gray-400 font-medium hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                {/* Classes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {classes.length > 0 ? (
                    classes.map((cls) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      const classStudentCount = students.filter(
                        s => s.student?.class_id === cls.id || s.student?.class_room_id === cls.id
                      ).length;

                      return (
                        <div
                          key={cls.id}
                          onClick={() => handleToggleClass(cls.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-cyan-50 border-cyan-300 dark:bg-cyan-950/20 dark:border-cyan-500/30 text-cyan-950 dark:text-cyan-200 shadow-xs'
                              : 'bg-slate-50 border-slate-200 dark:bg-white/[0.02] dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-4 w-4 shrink-0 pointer-events-none"
                            />
                            <div className="truncate">
                              <span className="block font-bold text-xs truncate">{cls.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-gray-400 font-normal">
                                Tingkat {cls.level}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isSelected
                              ? 'bg-cyan-200/60 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300'
                              : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                          }`}>
                            {classStudentCount} Siswa
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="col-span-2 text-xs text-slate-500 dark:text-gray-500 p-4 text-center">
                      Belum ada data kelas yang dibuat. Silakan tambahkan master kelas terlebih dahulu.
                    </p>
                  )}
                </div>

                {/* Auto Enrollment Summary */}
                <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/20 text-cyan-900 dark:text-cyan-200 rounded-2xl text-xs font-medium flex items-center justify-between">
                  <span>
                    <strong>{selectedClassIds.length}</strong> Kelas terpilih
                  </span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400">
                    {selectedStudentIds.length} Siswa otomatis terdaftar
                  </span>
                </div>

                {/* Collapsible Individual Student Fine-tuning */}
                <details className="text-xs group border border-slate-200 dark:border-white/5 rounded-2xl p-2.5 bg-slate-50/50 dark:bg-white/[0.01]">
                  <summary className="cursor-pointer font-bold text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 select-none flex items-center justify-between">
                    <span>Lihat / Sesuaikan Siswa Perorangan</span>
                    <span className="text-[10px] text-slate-400 font-normal group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-white/5 max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {students.map((student) => {
                      const isChecked = selectedStudentIds.includes(student.student?.id);
                      return (
                        <label
                          key={student.id}
                          className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-gray-300 font-medium cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedStudentIds(prev => 
                                prev.includes(student.student?.id)
                                  ? prev.filter(id => id !== student.student?.id)
                                  : [...prev, student.student?.id]
                              );
                            }}
                            className="rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5"
                          />
                          <span className="truncate">{student.name} — ({student.student?.class_room?.name ?? 'Tanpa Kelas'})</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition shadow-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || (selectedClassIds.length === 0 && selectedStudentIds.length === 0)}
                  className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center shadow-lg shadow-cyan-600/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Simpan Sesi Gelombang</span>
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

export default ExamsPage;
