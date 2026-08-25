import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../../shared/api/client';
import { useToast } from '../../shared/context/ToastContext';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { ExamPrintReportModal } from './components/ExamPrintReportModal';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Check,
  X
} from 'lucide-react';

interface ExamItem {
  id: number;
  title: string;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  status: string;
  kkm_score: number;
  start_time: string;
}

interface StudentReportItem {
  rank: number;
  attempt_id: number;
  student_id: number;
  name: string;
  username: string;
  nisn: string;
  nis: string;
  class_name: string;
  major_name: string;
  status: string;
  total_score: number | null;
  is_passed: boolean;
  started_at: string | null;
  submitted_at: string | null;
  duration_minutes: number | null;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
}

interface QuestionItemAnalysis {
  number: number;
  question_id: number;
  type: string;
  content_preview: string;
  topic: string;
  difficulty: string;
  weight: number;
  total_answered: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  accuracy_rate: number;
  performance_category: string;
}

interface ReportData {
  exam: {
    id: number;
    title: string;
    subject_name: string;
    subject_code: string;
    academic_year: string;
    duration_minutes: number;
    start_time: string | null;
    end_time: string | null;
    kkm_score: number;
    status: string;
    total_questions: number;
    total_weight: number;
  };
  statistics: {
    total_participants: number;
    completed_count: number;
    in_progress_count: number;
    disqualified_count: number;
    not_started_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    passed_count: number;
    remedial_count: number;
    pass_rate_percent: number;
    score_distribution: {
      range_0_20: number;
      range_21_40: number;
      range_41_60: number;
      range_61_80: number;
      range_81_100: number;
    };
  };
  students: StudentReportItem[];
  item_analysis: QuestionItemAnalysis[];
}

export const ExamReportPage: React.FC = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  // Loading & Action states
  const [loadingExams, setLoadingExams] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'students' | 'analysis'>('students');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Exam Search Combobox states
  const [isExamMenuOpen, setIsExamMenuOpen] = useState<boolean>(false);
  const [examSearchQuery, setExamSearchQuery] = useState<string>('');
  const examSelectorRef = useRef<HTMLDivElement>(null);

  // Load Exam List on mount
  useEffect(() => {
    fetchExams();
  }, []);

  // Click outside to close exam dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (examSelectorRef.current && !examSelectorRef.current.contains(e.target as Node)) {
        setIsExamMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const res = await apiClient.get('/teacher/exams');
      setExams(res.data);
      if (res.data.length > 0) {
        setSelectedExamId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load exams list:', err);
      toast.error('Gagal memuat daftar ujian.');
    } finally {
      setLoadingExams(false);
    }
  };

  // Filtered Exams based on Combobox typing
  const filteredExams = useMemo(() => {
    if (!examSearchQuery.trim()) return exams;
    const q = examSearchQuery.toLowerCase();
    return exams.filter((ex) => {
      const matchTitle = ex.title.toLowerCase().includes(q);
      const matchSubject = ex.subject?.name?.toLowerCase().includes(q) || false;
      const matchCode = ex.subject?.code?.toLowerCase().includes(q) || false;
      return matchTitle || matchSubject || matchCode;
    });
  }, [exams, examSearchQuery]);

  const selectedExam = useMemo(() => {
    return exams.find((e) => e.id === selectedExamId) || null;
  }, [exams, selectedExamId]);

  // Load Report whenever selectedExamId changes
  useEffect(() => {
    if (selectedExamId) {
      fetchReport(selectedExamId);
    }
  }, [selectedExamId]);

  const fetchReport = async (examId: number) => {
    setLoadingReport(true);
    try {
      const res = await apiClient.get(`/teacher/exams/${examId}/report`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load exam report:', err);
      toast.error('Gagal memuat data laporan ujian.');
    } finally {
      setLoadingReport(false);
    }
  };

  // Export Excel Handler
  const handleExportCsv = async () => {
    if (!selectedExamId || !report) return;
    setExportingCsv(true);
    try {
      const res = await apiClient.get(`/teacher/exams/${selectedExamId}/report/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.ms-excel;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Hasil_Ujian_${report.exam.title.replace(/\s+/g, '_')}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Laporan rekap nilai Excel (.xls) berhasil diunduh!');
    } catch (err) {
      console.error('Export Excel error:', err);
      toast.error('Gagal mengekspor laporan nilai.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Extract unique class list for filter dropdown
  const classList = useMemo(() => {
    if (!report?.students) return [];
    const set = new Set(report.students.map((s) => s.class_name).filter(Boolean));
    return Array.from(set);
  }, [report]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!report?.students) return [];
    return report.students.filter((st) => {
      const matchSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = selectedClass === 'all' || st.class_name === selectedClass;

      let matchStatus = true;
      if (statusFilter === 'passed') matchStatus = st.is_passed;
      else if (statusFilter === 'remedial') matchStatus = !st.is_passed && st.status !== 'disqualified';
      else if (statusFilter === 'disqualified') matchStatus = st.status === 'disqualified';

      return matchSearch && matchClass && matchStatus;
    });
  }, [report, searchQuery, selectedClass, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header & Exam Selector (Stacking Context z-40) */}
      <div className="glass-panel p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-40">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Laporan Hasil Ujian & Analisis
              </h1>
              <p className="text-slate-500 dark:text-gray-400 text-xs font-medium mt-0.5">
                Rekapitulasi peringkat nilai, statistik kelulusan (KKM), dan analisis butir soal
              </p>
            </div>
          </div>
        </div>

        {/* Searchable Exam Combobox & Export Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Searchable Combobox */}
          <div className="relative flex-1 md:w-80 z-50" ref={examSelectorRef}>
            <div 
              onClick={() => setIsExamMenuOpen(true)}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white dark:bg-[#0c101c] border rounded-2xl cursor-pointer transition shadow-xs ${
                isExamMenuOpen 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Search className="h-4 w-4 text-indigo-500 shrink-0" />
                {isExamMenuOpen ? (
                  <input
                    type="text"
                    value={examSearchQuery}
                    onChange={(e) => setExamSearchQuery(e.target.value)}
                    placeholder="Ketik nama ujian..."
                    autoFocus
                    className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedExam ? selectedExam.title : (loadingExams ? 'Memuat ujian...' : 'Pilih Ujian')}
                    </span>
                    {selectedExam?.subject && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold rounded shrink-0">
                        {selectedExam.subject.name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {examSearchQuery && isExamMenuOpen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExamSearchQuery('');
                    }}
                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExamMenuOpen ? 'rotate-180 text-indigo-500' : ''}`} />
              </div>
            </div>

            {/* Dropdown Popup List with high z-index and solid background */}
            {isExamMenuOpen && (
              <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-full md:w-96 z-50 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden animate-scale-up max-h-80 flex flex-col bg-white dark:bg-[#0c101c] divide-y divide-slate-100 dark:divide-white/5">
                <div className="p-2.5 bg-slate-50 dark:bg-white/[0.03] flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 font-bold px-3">
                  <span>Daftar Paket Ujian ({filteredExams.length})</span>
                  {examSearchQuery && (
                    <span className="text-indigo-600 dark:text-indigo-400 text-[10px]">Filter aktif</span>
                  )}
                </div>

                <div className="overflow-y-auto max-h-64 p-1.5 space-y-1 bg-white dark:bg-[#0c101c]">
                  {loadingExams ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">Memuat daftar ujian...</div>
                  ) : filteredExams.length === 0 ? (
                    <div className="p-6 text-center">
                      <Search className="h-6 w-6 text-slate-300 dark:text-gray-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-700 dark:text-gray-300">Tidak ada ujian ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Coba gunakan kata kunci pencarian lain</p>
                    </div>
                  ) : (
                    filteredExams.map((ex) => {
                      const isSelected = ex.id === selectedExamId;
                      return (
                        <div
                          key={ex.id}
                          onClick={() => {
                            setSelectedExamId(ex.id);
                            setIsExamMenuOpen(false);
                            setExamSearchQuery('');
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-200/60 dark:border-indigo-500/30'
                              : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 font-medium'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs ${isSelected ? 'font-black text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-gray-200 font-bold'} truncate`}>
                                {ex.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-gray-400">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {ex.subject?.name || 'Umum'}
                              </span>
                              <span>•</span>
                              <span>ID: #{ex.id}</span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="p-1 bg-indigo-600 text-white rounded-full shrink-0">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => selectedExamId && fetchReport(selectedExamId)}
            disabled={loadingReport || !selectedExamId}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 rounded-xl transition"
            title="Muat Ulang Laporan"
          >
            <RefreshCw className={`h-4 w-4 ${loadingReport ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {/* Action Buttons */}
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || !report}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{exportingCsv ? 'Mengekspor...' : 'Ekspor Excel'}</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            disabled={!report || report.students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Stacking Context z-10) */}
      <div className="relative z-10 space-y-6">

      {loadingReport ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
          </div>
          <TableSkeleton rows={6} />
        </div>
      ) : !report ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
          <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-gray-200">Pilih Ujian untuk Melihat Laporan</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Silakan pilih salah satu ujian pada menu dropdown di atas untuk menganalisis hasil dan rekap nilai peserta.
          </p>
        </div>
      ) : (
        <>
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Rata-Rata Nilai */}
            <div className="glass-panel p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-indigo-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Rata-Rata Nilai</span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {report.statistics.average_score}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                  KKM: <strong className="text-indigo-600 dark:text-indigo-400">{report.exam.kkm_score}</strong> Poin
                </div>
              </div>
            </div>

            {/* Card 2: Nilai Tertinggi */}
            <div className="glass-panel p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Nilai Tertinggi</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {report.statistics.highest_score}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                  Skor Maksimal Ujian
                </div>
              </div>
            </div>

            {/* Card 3: Nilai Terendah */}
            <div className="glass-panel p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-rose-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Nilai Terendah</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                  {report.statistics.lowest_score}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                  Skor Terendah Tercatat
                </div>
              </div>
            </div>

            {/* Card 4: Tingkat Kelulusan */}
            <div className="glass-panel p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-teal-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Tingkat Kelulusan</span>
                <div className="p-2 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
                  {report.statistics.pass_rate_percent}%
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                  <strong className="text-teal-600">{report.statistics.passed_count} Lulus</strong> / {report.statistics.remedial_count} Remedial
                </div>
              </div>
            </div>

            {/* Card 5: Total Peserta */}
            <div className="glass-panel p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-blue-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Total Partisipasi</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {report.statistics.total_participants}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                  {report.statistics.completed_count} Selesai • {report.statistics.disqualified_count} Diskualifikasi
                </div>
              </div>
            </div>

          </div>

          {/* Visual Score Distribution & Pass Rate Ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Score Range Distribution Bars */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Distribusi Rentang Nilai Siswa
              </h3>
              
              <div className="space-y-3">
                {[
                  { label: '81 - 100 (Sangat Baik)', count: report.statistics.score_distribution.range_81_100, color: 'bg-emerald-500' },
                  { label: '61 - 80 (Baik / KKM)', count: report.statistics.score_distribution.range_61_80, color: 'bg-teal-500' },
                  { label: '41 - 60 (Cukup)', count: report.statistics.score_distribution.range_41_60, color: 'bg-blue-500' },
                  { label: '21 - 40 (Kurang)', count: report.statistics.score_distribution.range_21_40, color: 'bg-amber-500' },
                  { label: '0 - 20 (Sangat Kurang)', count: report.statistics.score_distribution.range_0_20, color: 'bg-rose-500' },
                ].map((range, i) => {
                  const percent = report.statistics.total_participants > 0
                    ? Math.round((range.count / report.statistics.total_participants) * 100)
                    : 0;

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-gray-300">{range.label}</span>
                        <span className="text-slate-500 dark:text-gray-400">
                          {range.count} Siswa ({percent}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${range.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pass vs Remedial Gauge Card */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-emerald-500" />
                  Rasio Kelulusan KKM
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Ambang batas KKM ditetapkan pada angka <strong className="text-indigo-600 dark:text-indigo-400">{report.exam.kkm_score}</strong>.
                </p>
              </div>

              <div className="my-6 text-center">
                <div className="inline-flex items-center justify-center p-6 rounded-full bg-slate-100 dark:bg-white/5 border-4 border-indigo-500/20 relative">
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                    {report.statistics.pass_rate_percent}%
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mt-2">
                  {report.statistics.passed_count} dari {report.statistics.total_participants} Siswa Lulus KKM
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-white/5 text-center text-xs">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold block">Lulus ({report.statistics.passed_count})</span>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <span className="text-amber-700 dark:text-amber-400 font-bold block">Remedial ({report.statistics.remedial_count})</span>
                </div>
              </div>
            </div>

          </div>

          {/* Navigation Tabs (Rekap Nilai vs Analisis Butir Soal) */}
          <div className="flex bg-slate-200/60 dark:bg-white/5 p-1 rounded-2xl text-xs font-bold gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'students'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Rekapitulasi Nilai & Peringkat Siswa</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md">
                {report.students.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'analysis'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              <span>Analisis Butir Soal (Item Analysis)</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 rounded-md">
                {report.item_analysis.length}
              </span>
            </button>
          </div>

          {/* TAB 1: REKAPITULASI NILAI SISWA */}
          {activeTab === 'students' && (
            <div className="glass-panel p-6 rounded-3xl shadow-xl space-y-4">
              
              {/* Table Search & Filter Bar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa, NISN..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Filter Kelas */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-transparent font-bold text-slate-700 dark:text-gray-300 focus:outline-none"
                    >
                      <option value="all">Semua Kelas</option>
                      {classList.map((cls, idx) => (
                        <option key={idx} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Status Kelulusan */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-black/20 px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="passed">Lulus KKM</option>
                    <option value="remedial">Remedial</option>
                    <option value="disqualified">Didiskualifikasi</option>
                  </select>
                </div>
              </div>

              {/* Table Scores */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/5">
                      <th className="px-4 py-3 text-center w-16">Rank</th>
                      <th className="px-4 py-3">NISN / Akun</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-center">Benar / Salah</th>
                      <th className="px-4 py-3 text-center">Durasi</th>
                      <th className="px-4 py-3 text-center">Pelanggaran</th>
                      <th className="px-4 py-3 text-center font-black">Nilai Akhir</th>
                      <th className="px-4 py-3 text-center">Hasil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 dark:text-gray-500 font-medium">
                          Tidak ditemukan data peserta ujian yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => (
                        <tr key={st.attempt_id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.01] transition">
                          {/* Rank Badge */}
                          <td className="px-4 py-3 text-center">
                            {st.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-sm">
                                🥇
                              </span>
                            ) : st.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black shadow-sm">
                                🥈
                              </span>
                            ) : st.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600/80 text-white font-black shadow-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="font-bold text-slate-500 dark:text-gray-400">{st.rank}</span>
                            )}
                          </td>

                          {/* NISN */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-gray-400">
                            {st.nisn !== '-' ? st.nisn : st.username}
                          </td>

                          {/* Nama Siswa */}
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {st.name}
                          </td>

                          {/* Kelas */}
                          <td className="px-4 py-3 text-slate-600 dark:text-gray-400 font-medium">
                            {st.class_name}
                          </td>

                          {/* B / S / K */}
                          <td className="px-4 py-3 text-center font-mono text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{st.correct_count}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-rose-600 dark:text-rose-400">{st.incorrect_count}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-400">{st.unanswered_count}</span>
                          </td>

                          {/* Durasi */}
                          <td className="px-4 py-3 text-center text-slate-600 dark:text-gray-400 text-[11px]">
                            {st.duration_minutes !== null ? `${st.duration_minutes}m` : '-'}
                          </td>

                          {/* Pelanggaran */}
                          <td className="px-4 py-3 text-center">
                            {st.violation_count > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                                <AlertTriangle className="h-3 w-3" />
                                {st.violation_count}x
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-[11px] font-medium">Bersih</span>
                            )}
                          </td>

                          {/* Nilai Akhir */}
                          <td className="px-4 py-3 text-center font-black text-sm text-slate-900 dark:text-white">
                            {st.total_score !== null ? st.total_score : '0'}
                          </td>

                          {/* Status Kelulusan */}
                          <td className="px-4 py-3 text-center font-bold text-[11px]">
                            {st.status === 'disqualified' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                <XCircle className="h-3.5 w-3.5" />
                                Diskualifikasi
                              </span>
                            ) : st.is_passed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Lulus
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Remedial
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ANALISIS BUTIR SOAL */}
          {activeTab === 'analysis' && (
            <div className="glass-panel p-6 rounded-3xl shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Analisis Kinerja Butir Soal</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Evaluasi tingkat kesukaran dan persentase jawaban benar peserta ujian per nomor soal
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/5">
                      <th className="px-4 py-3 text-center w-12">No</th>
                      <th className="px-4 py-3">Pratinjau Pertanyaan</th>
                      <th className="px-4 py-3">Tipe Soal</th>
                      <th className="px-4 py-3">Topik / Materi</th>
                      <th className="px-4 py-3 text-center">Bobot</th>
                      <th className="px-4 py-3 text-center">Benar / Salah</th>
                      <th className="px-4 py-3">Ketepatan (% Akurasi)</th>
                      <th className="px-4 py-3 text-center">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {report.item_analysis.map((item) => (
                      <tr key={item.number} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.01] transition">
                        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">{item.number}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-gray-300 max-w-xs truncate" title={item.content_preview}>
                          {item.content_preview}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-white/5 rounded-md text-[10px] font-bold text-slate-700 dark:text-gray-300 uppercase">
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-gray-400 font-medium">{item.topic}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-gray-300">{item.weight}</td>
                        <td className="px-4 py-3 text-center font-mono text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.correct_count}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-rose-600 dark:text-rose-400">{item.incorrect_count}</span>
                        </td>
                        <td className="px-4 py-3 w-48">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-700 dark:text-gray-300">{item.accuracy_rate}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.accuracy_rate >= 75
                                    ? 'bg-emerald-500'
                                    : item.accuracy_rate >= 40
                                    ? 'bg-indigo-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${item.accuracy_rate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                              item.performance_category === 'Mudah'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : item.performance_category === 'Sedang'
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {item.performance_category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Printable Report Modal */}
          {showPrintModal && (
            <ExamPrintReportModal data={report} onClose={() => setShowPrintModal(false)} />
          )}

        </>
      )}
      </div>

    </div>
  );
};
