import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  BookOpen, Calendar, FileText, 
  Layers, ArrowRight, Sparkles, Clock 
} from 'lucide-react';
import { 
  WelcomeBanner, 
  GradientStatCard, 
  DonutProgressChart, 
  HorizontalProgressBar, 
  CalendarWidget, 
  RemindersList, 
  HighlightDate, 
  ReminderItem,
  ProgressItem 
} from '../../shared/components/dashboard';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [questionsRes, packagesRes, examsRes] = await Promise.all([
        apiClient.get('/teacher/questions').catch(() => ({ data: [] })),
        apiClient.get('/teacher/packages').catch(() => ({ data: [] })),
        apiClient.get('/teacher/exams').catch(() => ({ data: [] })),
      ]);

      setQuestions(questionsRes.data || []);
      setPackages(packagesRes.data || []);
      setExams(examsRes.data || []);
    } catch (error) {
      console.error('Failed to load teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  // Compute question types distribution
  const mcqCount = questions.filter(q => q.type === 'multiple_choice_single' || q.type === 'multiple_choice_complex').length;
  const essayCount = questions.filter(q => q.type === 'essay').length;
  const matchingCount = questions.filter(q => q.type === 'matching' || q.type === 'true_false').length;
  const totalQuestions = Math.max(questions.length, 1);

  const mcqPercent = Math.round((mcqCount / totalQuestions) * 100);
  const essayPercent = Math.round((essayCount / totalQuestions) * 100);
  const matchingPercent = 100 - mcqPercent - essayPercent;

  // Question packages progress items
  const packageProgressItems: ProgressItem[] = packages.slice(0, 4).map((pkg) => {
    const qCount = pkg.questions_count ?? (pkg.questions ? pkg.questions.length : 15);
    const targetCount = 30;
    const percent = Math.min(Math.round((qCount / targetCount) * 100), 100);

    return {
      id: pkg.id,
      label: pkg.name || 'Paket Soal',
      sublabel: pkg.subject?.name || 'Mata Pelajaran',
      percentage: percent,
      badgeText: `${qCount} Soal`,
      colorClass: 'from-cyan-500 to-indigo-500'
    };
  });

  // Calendar Highlight Dates
  const calendarHighlights: HighlightDate[] = exams.map((ex) => ({
    date: ex.start_time ? ex.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
    title: ex.title || 'Jadwal Ujian',
    type: 'exam'
  }));

  // Reminders / Notification items
  const reminders: ReminderItem[] = [
    {
      id: 'rem-1',
      title: 'Koreksi Essay Menunggu',
      description: 'Terdapat lembar essay siswa yang siap dinilai manual.',
      timeAgo: 'Hari ini',
      type: 'warning' as const,
      onClick: () => navigate('/teacher/grading')
    },
    {
      id: 'rem-2',
      title: 'Paket Soal Terverifikasi',
      description: 'Paket soal simulasi siap digunakan untuk jadwal ujian.',
      timeAgo: 'Kemarin',
      type: 'success' as const,
      onClick: () => navigate('/teacher/questions')
    },
    {
      id: 'rem-3',
      title: 'Panduan Import Soal CSV',
      description: 'Format template soal pilihan ganda, essay & menjodohkan tersedia.',
      timeAgo: 'Info',
      type: 'info' as const,
      onClick: () => navigate('/teacher/questions')
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Welcome Banner */}
      <WelcomeBanner
        title={`Selamat Mengajar, ${user?.name || 'Bapak/Ibu Guru'} 📚`}
        subtitle="Kelola bank soal mandiri, pantau jadwal ujian kelas, dan periksa koreksi essay siswa dengan mudah."
        roleBadge="Panel Pengajar"
        metrics={[
          { label: 'Bank Soal', value: questions.length, highlight: true },
          { label: 'Paket Soal', value: packages.length },
          { label: 'Jadwal Ujian', value: exams.length }
        ]}
        actionLabel="+ Buat Soal Baru"
        onAction={() => navigate('/teacher/questions')}
        icon={Sparkles}
      />

      {/* 2. Gradient Stat Cards Grid */}
      {loading ? (
        <CardGridSkeleton count={4} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <GradientStatCard
            title="Koleksi Bank Soal"
            value={`${questions.length} Butir`}
            subtitle="Soal tersimpan di database"
            icon={BookOpen}
            variant="cyan"
            trend={{ value: 'Siap Pakai', isPositive: true }}
            onClick={() => navigate('/teacher/questions')}
          />
          <GradientStatCard
            title="Paket Soal Ujian"
            value={`${packages.length} Paket`}
            subtitle="Kumpulan soal terstruktur"
            icon={Layers}
            variant="indigo"
            onClick={() => navigate('/teacher/questions')}
          />
          <GradientStatCard
            title="Jadwal Ujian"
            value={`${exams.length} Sesi`}
            subtitle="Ujian terjadwal & aktif"
            icon={Calendar}
            variant="amber"
            onClick={() => navigate('/teacher/exams')}
          />
          <GradientStatCard
            title="Koreksi Manual"
            value="Koreksi"
            subtitle="Penilaian lembar essay"
            icon={FileText}
            variant="emerald"
            onClick={() => navigate('/teacher/grading')}
          />
        </div>
      )}

      {/* 3. Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Charts & Exams Management */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DonutProgressChart
              title="Komposisi Tipe Soal"
              subtitle="Sebaran ragam butir soal Anda"
              primaryPercentage={mcqPercent}
              centerLabel={`${mcqPercent}%`}
              centerSublabel="Pilgan"
              items={[
                { label: 'Pilihan Ganda', percentage: mcqPercent, color: '#06b6d4', count: mcqCount },
                { label: 'Essay / Uraian', percentage: essayPercent, color: '#10b981', count: essayCount },
                { label: 'Menjodohkan / B/S', percentage: matchingPercent, color: '#f59e0b', count: matchingCount }
              ]}
            />

            <HorizontalProgressBar
              title="Kelengkapan Paket Soal"
              subtitle="Target 30 butir soal per paket"
              items={packageProgressItems.length > 0 ? packageProgressItems : [
                { id: '1', label: 'Simulasi CBT Utama', sublabel: 'Umum', percentage: 100, badgeText: 'Siap Ujian' }
              ]}
              maxItems={4}
            />
          </div>

          {/* Scheduled Exams List Table */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Jadwal Ujian Aktif</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Sesi ujian yang Anda ampu</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/teacher/exams')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 transition"
              >
                <span>Kelola Ujian</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Nama Ujian</th>
                    <th className="py-3 px-3">Mata Pelajaran</th>
                    <th className="py-3 px-3">Durasi</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                  {exams.length > 0 ? (
                    exams.slice(0, 5).map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <span className="block truncate max-w-[160px]">{ex.title}</span>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-normal">{ex.academic_year?.name || '2025/2026'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 text-[10px] font-bold">
                            {ex.subject?.name || 'Mata Pelajaran'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold">{ex.duration_minutes || 60} Menit</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate('/teacher/grading')}
                            className="px-3.5 py-1.5 bg-indigo-600 dark:bg-indigo-600/30 hover:bg-indigo-500 dark:hover:bg-indigo-600 text-white dark:text-indigo-200 hover:text-white rounded-xl text-[11px] font-bold transition shadow-sm"
                          >
                            Koreksi
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 dark:text-gray-500 text-xs">
                        Belum ada jadwal ujian yang dibuat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Calendar Widget & Reminders List */}
        <div className="space-y-6">
          <CalendarWidget highlights={calendarHighlights} />
          <RemindersList
            title="Pengingat Pengajar"
            reminders={reminders}
            emptyMessage="Semua tugas pengajar telah tuntas"
          />
        </div>

      </div>

    </div>
  );
};
export default TeacherDashboard;
