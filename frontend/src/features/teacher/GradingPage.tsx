import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { TableSkeleton, PageLoader } from '../../shared/components/LoadingSkeleton';
import { FileText, ChevronRight, ChevronLeft, X, AlertCircle, Search, Layers } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
}

interface Exam {
  id: number;
  title: string;
  subject?: Subject;
}

interface Student {
  id: number;
  user: {
    name: string;
    email: string;
  };
}

interface Attempt {
  id: number;
  student_id: number;
  exam_id: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'auto_submitted' | 'disqualified';
  started_at: string;
  submitted_at: string | null;
  total_score: number | null;
  student?: Student;
}

interface Question {
  id: number;
  type: 'multiple_choice_single' | 'multiple_choice_multi' | 'essay' | 'true_false' | 'matching';
  content: string;
  pivot?: {
    weight: number;
  };
}

interface Answer {
  id: number;
  question_bank_id: number;
  answer_content: any;
  score: number | null;
  question_bank?: Question;
}

import { useToast } from '../../shared/context/ToastContext';

export const GradingPage: React.FC = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Pagination & Filter states for Exam List
  const [searchQuery, setSearchQuery] = useState('');
  const [examPage, setExamPage] = useState(1);
  const examsPerPage = 5;

  // Loading states
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  // Scoring states
  const [gradingScores, setGradingScores] = useState<{ [answerId: number]: number }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      try {
        const res = await apiClient.get('/teacher/exams');
        setExams(res.data);
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  const handleSelectExam = async (exam: Exam) => {
    setSelectedExam(exam);
    setSelectedAttempt(null);
    setAnswers([]);
    setLoadingAttempts(true);
    try {
      const res = await apiClient.get(`/teacher/exams/${exam.id}/attempts`);
      setAttempts(res.data);
    } catch (err) {
      console.error('Failed to load attempts:', err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleSelectAttempt = async (attempt: Attempt) => {
    setSelectedAttempt(attempt);
    setLoadingAnswers(true);
    try {
      const res = await apiClient.get(`/teacher/attempts/${attempt.id}`);
      const fetchedAnswers = res.data.answers || [];
      setAnswers(fetchedAnswers);
      
      // Initialize scores state for essay answers
      const initialScores: { [id: number]: number } = {};
      fetchedAnswers.forEach((ans: Answer) => {
        if (ans.question_bank?.type === 'essay') {
          initialScores[ans.id] = ans.score ?? 0;
        }
      });
      setGradingScores(initialScores);
    } catch (err) {
      console.error('Failed to load attempt answers:', err);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleScoreChange = (ansId: number, value: string) => {
    setGradingScores(prev => ({
      ...prev,
      [ansId]: Number(value)
    }));
  };

  const handleGradeSubmit = async (ansId: number, maxWeight: number) => {
    setError(null);
    const score = gradingScores[ansId] ?? 0;

    if (score < 0 || score > maxWeight) {
      setError(`Nilai untuk soal ini harus berada antara 0 sampai batas maksimum ${maxWeight}.`);
      return;
    }

    try {
      await apiClient.post(`/teacher/answers/${ansId}/grade`, { score });
      toast.success('Berhasil menyimpan nilai essay!');
      // Reload attempt to get updated total score
      if (selectedAttempt) {
        handleSelectAttempt(selectedAttempt);
        // Refresh attempts list in background
        if (selectedExam) {
          const res = await apiClient.get(`/teacher/exams/${selectedExam.id}/attempts`);
          setAttempts(res.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan nilai.');
    }
  };

  const essayAnswers = answers.filter(ans => ans.question_bank?.type === 'essay');

  // Filtered and Paginated Exams
  const filteredExams = exams.filter(ex =>
    ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.subject?.name && ex.subject.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalExamPages = Math.max(1, Math.ceil(filteredExams.length / examsPerPage));
  const paginatedExams = filteredExams.slice((examPage - 1) * examsPerPage, examPage * examsPerPage);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setExamPage(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/30">
            <FileText className="h-6 w-6" />
          </div>
          <span>Koreksi Manual Jawaban Essay</span>
        </h1>
        <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">Periksa jawaban esai siswa dan berikan penilaian bobot nilai.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Exams List Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Daftar Paket Ujian</span>
            </h3>
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-500/20">
              {filteredExams.length} Total
            </span>
          </div>

          <div className="glass-panel p-3.5 rounded-3xl space-y-2.5 shadow-sm border border-slate-200 dark:border-white/5 flex flex-col justify-between min-h-[380px]">
            <div className="space-y-2">
              {/* Search Bar inside sidebar */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama ujian / mapel..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 glass-input rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
                />
              </div>

              {/* Exam items */}
              {loadingExams ? (
                <div className="p-2 space-y-2">
                  <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-2xl skeleton-shimmer"></div>
                  <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-2xl skeleton-shimmer"></div>
                  <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-2xl skeleton-shimmer"></div>
                  <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-2xl skeleton-shimmer"></div>
                  <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-2xl skeleton-shimmer"></div>
                </div>
              ) : paginatedExams.length > 0 ? (
                <div className="space-y-1.5">
                  {paginatedExams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => handleSelectExam(exam)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex justify-between items-center ${
                        selectedExam?.id === exam.id
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                          : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/5'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">{exam.title}</span>
                        {exam.subject?.name && (
                          <span className={`text-[10px] block font-medium truncate ${
                            selectedExam?.id === exam.id ? 'text-cyan-100' : 'text-slate-400 dark:text-gray-500'
                          }`}>
                            {exam.subject.name}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 dark:text-gray-500 font-medium">
                  <p className="text-xs">Tidak ada paket ujian ditemukan.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {!loadingExams && filteredExams.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                  Hal. <strong className="text-slate-900 dark:text-white font-bold">{examPage}</strong> dari <strong className="text-slate-900 dark:text-white font-bold">{totalExamPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={examPage <= 1}
                    onClick={() => setExamPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none transition"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={examPage >= totalExamPages}
                    onClick={() => setExamPage(prev => Math.min(prev + 1, totalExamPages))}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 disabled:opacity-40 disabled:pointer-events-none transition"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Attempts Table */}
        <div className="lg:col-span-2 space-y-3">
          {selectedExam ? (
            <>
              <h3 className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider px-1">
                Daftar Pengerjaan Siswa — {selectedExam.title}
              </h3>
              
              {loadingAttempts ? (
                <TableSkeleton rows={4} columns={5} />
              ) : (
                <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                          <th className="px-6 py-4">Nama Siswa</th>
                          <th className="px-6 py-4">Sesi / Gelombang</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Total Nilai</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-white/5 text-sm text-slate-700 dark:text-gray-300">
                        {attempts.length > 0 ? (
                          attempts.map((att) => (
                            <tr 
                              key={att.id} 
                              className={`hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors ${
                                selectedAttempt?.id === att.id ? 'bg-cyan-50/50 dark:bg-white/[0.02]' : ''
                              }`}
                            >
                              <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                {att.student?.user?.name || 'Siswa'}
                              </td>
                              <td className="px-6 py-4 font-medium">
                                {(att as any).exam_group?.name || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                                  att.status === 'submitted' || att.status === 'auto_submitted'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                    : att.status === 'disqualified'
                                    ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                    : 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20'
                                }`}>
                                  {att.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                                {att.total_score !== null ? `${att.total_score}` : <span className="text-amber-600 dark:text-yellow-500 text-xs font-bold">Menunggu Essay</span>}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {(att.status === 'submitted' || att.status === 'auto_submitted') ? (
                                  <button
                                    onClick={() => handleSelectAttempt(att)}
                                    className="px-3.5 py-1.5 bg-indigo-100 dark:bg-indigo-600/20 hover:bg-indigo-200 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/25 rounded-xl text-xs font-bold transition shadow-xs"
                                  >
                                    Periksa Essay
                                  </button>
                                ) : (
                                  <span className="text-slate-400 dark:text-gray-500 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-gray-500 font-medium">
                              Belum ada siswa yang memulai ujian ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-panel py-16 text-center text-slate-500 dark:text-gray-500 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5">
              <FileText className="h-10 w-10 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-gray-300">Pilih salah satu paket ujian di sidebar untuk memulai proses koreksi.</p>
            </div>
          )}
        </div>

      </div>

      {/* Essay Answers Grading Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedAttempt(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-200 dark:border-cyan-500/20">
                <FileText className="h-5 w-5" />
              </div>
              <span>Koreksi Jawaban Essay</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 font-medium">
              Siswa: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{selectedAttempt.student?.user?.name}</span> | Nilai Akhir: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedAttempt.total_score !== null ? selectedAttempt.total_score : 'Belum Lengkap'}</span>
            </p>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs shrink-0 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-6 min-h-0">
              {loadingAnswers ? (
                <PageLoader message="Memuat lembar jawaban siswa..." height="min-h-[250px]" />
              ) : essayAnswers.length > 0 ? (
                essayAnswers.map((ans, idx) => {
                  const q = ans.question_bank;
                  const maxWeight = q?.pivot?.weight || 2;
                  
                  return (
                    <div key={ans.id} className="p-5 bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-3xl space-y-4 shadow-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 text-[10px] font-bold rounded-lg">
                          SOAL ESSAY {idx + 1}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-gray-500 font-bold">Bobot Max Soal: {maxWeight}</span>
                      </div>

                      {/* Question content */}
                      <div className="text-slate-900 dark:text-white text-sm bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-transparent leading-relaxed font-medium">
                        <LaTeXRenderer text={q?.content || ''} />
                      </div>

                      {/* Student's answer */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Jawaban Siswa:</h4>
                        <div className="p-4 bg-cyan-50/70 dark:bg-cyan-950/10 border border-cyan-200 dark:border-cyan-500/10 rounded-2xl text-sm text-slate-800 dark:text-gray-300 whitespace-pre-wrap font-medium">
                          {ans.answer_content?.essay_text || <span className="text-slate-400 dark:text-gray-500 italic">Siswa mengosongkan jawaban</span>}
                        </div>
                      </div>

                      {/* Grading form */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-700 dark:text-gray-400">Berikan Nilai:</span>
                        <input
                          type="number"
                          min={0}
                          max={maxWeight}
                          step={0.1}
                          value={gradingScores[ans.id] ?? 0}
                          onChange={(e) => handleScoreChange(ans.id, e.target.value)}
                          className="w-20 px-3 py-1.5 glass-input rounded-xl text-center text-slate-900 dark:text-white text-xs font-bold"
                        />
                        <button
                          onClick={() => handleGradeSubmit(ans.id, maxWeight)}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-600/30"
                        >
                          Simpan Skor
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-500 text-center py-8 font-medium">Tidak ada soal essay dalam paket ujian ini.</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/5 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Tutup Lembar Pemeriksaan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default GradingPage;
