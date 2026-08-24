import React from 'react';
import { X, Printer, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface StudentReportItem {
  rank: number;
  name: string;
  nisn: string;
  class_name: string;
  total_score: number | null;
  is_passed: boolean;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
  duration_minutes: number | null;
  status: string;
}

interface ExamReportData {
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
    total_questions: number;
  };
  statistics: {
    total_participants: number;
    completed_count: number;
    disqualified_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    passed_count: number;
    remedial_count: number;
    pass_rate_percent: number;
  };
  students: StudentReportItem[];
}

interface ExamPrintReportModalProps {
  data: ExamReportData;
  onClose: () => void;
}

export const ExamPrintReportModal: React.FC<ExamPrintReportModalProps> = ({ data, onClose }) => {
  const { exam, statistics, students } = data;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-5xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto print:max-h-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full">
        
        {/* Modal Controls Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Pratinjau Cetak Dokumen Laporan Hasil Ujian</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 md:p-12 overflow-y-auto print:p-0 print:overflow-visible font-sans">
          
          {/* School Header Kop Surat */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center relative">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900">
                LAPORAN REKAPITULASI HASIL UJIAN CBT
              </h1>
              <p className="text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-widest mt-0.5">
                Sistem Ujian Online Terintegrasi & Pengawasan Proctoring
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tahun Ajaran: {exam.academic_year} | Dicetak pada: {currentDate}
              </p>
            </div>
          </div>

          {/* Exam Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Nama Ujian:</span>
              <span className="font-bold text-slate-900 text-sm">{exam.title}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Mata Pelajaran:</span>
              <span className="font-bold text-slate-900 text-sm">{exam.subject_name} ({exam.subject_code})</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Standar KKM:</span>
              <span className="font-bold text-indigo-700 text-sm">{exam.kkm_score} Poin</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Jumlah Soal & Durasi:</span>
              <span className="font-bold text-slate-900 text-sm">{exam.total_questions} Butir ({exam.duration_minutes} Menit)</span>
            </div>
          </div>

          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 text-center">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-600 uppercase block">Rata-rata Nilai</span>
              <span className="text-lg font-black text-indigo-900">{statistics.average_score}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">Nilai Tertinggi</span>
              <span className="text-lg font-black text-emerald-900">{statistics.highest_score}</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
              <span className="text-[10px] font-bold text-rose-600 uppercase block">Nilai Terendah</span>
              <span className="text-lg font-black text-rose-900">{statistics.lowest_score}</span>
            </div>
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
              <span className="text-[10px] font-bold text-teal-600 uppercase block">Lulus KKM</span>
              <span className="text-lg font-black text-teal-900">{statistics.passed_count} ({statistics.pass_rate_percent}%)</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-[10px] font-bold text-amber-600 uppercase block">Remedial</span>
              <span className="text-lg font-black text-amber-900">{statistics.remedial_count}</span>
            </div>
          </div>

          {/* Student Scores Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold">
                  <th className="border border-slate-300 px-2.5 py-2 text-center w-10">No</th>
                  <th className="border border-slate-300 px-3 py-2">NISN</th>
                  <th className="border border-slate-300 px-3 py-2">Nama Lengkap Siswa</th>
                  <th className="border border-slate-300 px-3 py-2">Kelas</th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center">B/S/K</th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center">Durasi</th>
                  <th className="border border-slate-300 px-3 py-2 text-center font-black">Nilai</th>
                  <th className="border border-slate-300 px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => (
                  <tr key={idx} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="border border-slate-300 px-2.5 py-2 text-center font-bold">{st.rank}</td>
                    <td className="border border-slate-300 px-3 py-2 font-mono text-[11px] text-slate-600">{st.nisn}</td>
                    <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">{st.name}</td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-700">{st.class_name}</td>
                    <td className="border border-slate-300 px-2.5 py-2 text-center text-[11px] font-mono">
                      <span className="text-emerald-700 font-bold">{st.correct_count}</span>/
                      <span className="text-rose-700">{st.incorrect_count}</span>/
                      <span className="text-slate-400">{st.unanswered_count}</span>
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-center text-[11px] text-slate-600">
                      {st.duration_minutes !== null ? `${st.duration_minutes}m` : '-'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-center font-black text-sm text-slate-900">
                      {st.total_score !== null ? st.total_score : '0'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-center font-bold text-[11px]">
                      {st.status === 'disqualified' ? (
                        <span className="text-rose-700 flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3 inline" /> DISKUALIFIKASI
                        </span>
                      ) : st.is_passed ? (
                        <span className="text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3 inline" /> LULUS
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center justify-center gap-1">
                          <XCircle className="h-3 w-3 inline" /> REMEDIAL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature / Validation Footer */}
          <div className="grid grid-cols-2 gap-8 text-xs text-center pt-6 break-inside-avoid">
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-bold text-slate-800">Kepala Sekolah / Penanggung Jawab CBT</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900 underline tracking-wide">( ..................................................... )</p>
              <p className="text-slate-500 text-[10px]">NIP. .....................................................</p>
            </div>
            <div>
              <p className="text-slate-500">Kota / Tempat, {currentDate}</p>
              <p className="font-bold text-slate-800">Guru Pengampu Mata Pelajaran</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900 underline tracking-wide">( ..................................................... )</p>
              <p className="text-slate-500 text-[10px]">NIP. .....................................................</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
