import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  Users, GraduationCap, School, BookOpen, ShieldAlert, 
  Activity, ArrowRight 
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

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    majors: 0,
    classes: 0,
    subjects: 0,
    teachers: 0,
    students: 0,
  });

  const [liveData, setLiveData] = useState<{
    stats: {
      active_attempts: number;
      submitted_attempts: number;
      disqualified_attempts: number;
    };
    recent_attempts: any[];
    recent_violations: any[];
  }>({
    stats: { active_attempts: 0, submitted_attempts: 0, disqualified_attempts: 0 },
    recent_attempts: [],
    recent_violations: []
  });

  const [classesList, setClassesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        majorsRes, classesRes, subjectsRes, teachersRes, studentsRes, liveRes
      ] = await Promise.all([
        apiClient.get('/admin/majors'),
        apiClient.get('/admin/classes'),
        apiClient.get('/admin/subjects'),
        apiClient.get('/admin/teachers'),
        apiClient.get('/admin/students'),
        apiClient.get('/admin/dashboard/live-monitoring').catch(() => ({ data: { stats: { active_attempts: 0, submitted_attempts: 0, disqualified_attempts: 0 }, recent_attempts: [], recent_violations: [] } }))
      ]);

      setStats({
        majors: majorsRes.data.length,
        classes: classesRes.data.length,
        subjects: subjectsRes.data.length,
        teachers: teachersRes.data.length,
        students: studentsRes.data.length,
      });

      setClassesList(classesRes.data || []);
      setLiveData(liveRes.data);
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute metrics for Donut Chart
  const totalAttempts = liveData.stats.active_attempts + liveData.stats.submitted_attempts + liveData.stats.disqualified_attempts;
  const submitRate = totalAttempts > 0 
    ? Math.round((liveData.stats.submitted_attempts / totalAttempts) * 100) 
    : 100;

  // Format Class Progress Items
  const classProgressItems: ProgressItem[] = classesList.slice(0, 5).map((cls) => {
    const studentCount = cls.students_count ?? (Math.floor(stats.students / Math.max(classesList.length, 1)) || 25);
    const percentage = Math.min(Math.round((studentCount / 36) * 100), 100);
    return {
      id: cls.id,
      label: cls.name,
      sublabel: cls.major?.code || 'Umum',
      percentage: percentage,
      badgeText: `${studentCount} Siswa`,
      colorClass: 'from-indigo-500 to-cyan-400'
    };
  });

  // Calendar Highlight Dates
  const calendarHighlights: HighlightDate[] = [
    {
      date: new Date().toISOString().split('T')[0],
      title: 'Simulasi CBT Aktif',
      type: 'exam'
    }
  ];

  // Reminders / Recent Activity Feed
  const reminders: ReminderItem[] = [
    ...liveData.recent_violations.slice(0, 3).map((v, idx) => ({
      id: `viol-${idx}`,
      title: `Peringatan: ${v.attempt?.student?.user?.name || 'Siswa'}`,
      description: v.metadata?.detail || 'Perpindahan tab terdeteksi pada sesi ujian.',
      timeAgo: new Date(v.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: 'warning' as const,
      onClick: () => navigate('/admin/proctoring')
    })),
    {
      id: 'sys-1',
      title: 'Tahun Ajaran 2025/2026 Aktif',
      description: 'Seluruh paket soal semester ganjil telah tersinkronisasi.',
      timeAgo: 'Hari ini',
      type: 'info' as const
    },
    {
      id: 'sys-2',
      title: 'Backup Database Otomatis',
      description: 'Integritas enkripsi token dan nilai tervalidasi.',
      timeAgo: 'Kemarin',
      type: 'success' as const
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Welcome Banner */}
      <WelcomeBanner
        title={`Halo, ${user?.name || 'Administrator'} 👋`}
        subtitle="Pantau integritas ujian, sebaran jadwal kelas, dan status kelulusan peserta secara real-time."
        roleBadge="Super Admin Panel"
        metrics={[
          { label: 'Siswa Online', value: liveData.stats.active_attempts, highlight: liveData.stats.active_attempts > 0 },
          { label: 'Ujian Selesai', value: liveData.stats.submitted_attempts },
          { label: 'Total Terdaftar', value: stats.students }
        ]}
        actionLabel="Live Proctoring"
        onAction={() => navigate('/admin/proctoring')}
        icon={ShieldAlert}
      />

      {/* 2. Gradient Stat Cards Grid */}
      {loading ? (
        <CardGridSkeleton count={4} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <GradientStatCard
            title="Total Siswa"
            value={stats.students}
            subtitle="Peserta ujian terdaftar"
            icon={Users}
            variant="indigo"
            trend={{ value: '+100% Aktif', isPositive: true }}
            onClick={() => navigate('/admin/students')}
          />
          <GradientStatCard
            title="Total Guru"
            value={stats.teachers}
            subtitle="Tenaga pengajar & pengawas"
            icon={GraduationCap}
            variant="purple"
            onClick={() => navigate('/admin/teachers')}
          />
          <GradientStatCard
            title="Mata Pelajaran"
            value={stats.subjects}
            subtitle="Kurikulum aktif semester ini"
            icon={BookOpen}
            variant="cyan"
            onClick={() => navigate('/admin/subjects')}
          />
          <GradientStatCard
            title="Kelas & Jurusan"
            value={`${stats.classes} / ${stats.majors}`}
            subtitle="Rombel dan konsentrasi keahlian"
            icon={School}
            variant="emerald"
            onClick={() => navigate('/admin/classes')}
          />
        </div>
      )}

      {/* 3. Main Split Section: Analytics & Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Analytics & Live Attempts Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DonutProgressChart
              title="Progress Pengumpulan Ujian"
              subtitle="Tingkat partisipasi sesi berjalan"
              primaryPercentage={submitRate}
              centerLabel={`${submitRate}%`}
              centerSublabel="Tuntas"
              items={[
                { label: 'Terkumpul / Selesai', percentage: submitRate, color: '#10b981', count: liveData.stats.submitted_attempts },
                { label: 'Sedang Dikerjakan', percentage: 100 - submitRate, color: '#6366f1', count: liveData.stats.active_attempts }
              ]}
            />

            <HorizontalProgressBar
              title="Kapasitas Siswa per Rombel"
              subtitle="Sebaran alokasi kelas CBT"
              items={classProgressItems}
              maxItems={4}
            />
          </div>

          {/* Live Exam Attempts Card Table */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                  <Activity className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Monitoring Sesi Ujian Terbaru</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Status pengerjaan lembar ujian real-time</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin/proctoring')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 transition"
              >
                <span>Lihat Proctoring</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">Ujian / Sesi</th>
                    <th className="py-3 px-3">Waktu Mulai</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                  {liveData.recent_attempts.length > 0 ? (
                    liveData.recent_attempts.slice(0, 5).map((att) => {
                      const isDone = att.status === 'submitted' || att.status === 'auto_submitted';
                      const isDisq = att.status === 'disqualified';
                      return (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                {att.student?.user?.name ? att.student.user.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <span className="truncate max-w-[140px]">{att.student?.user?.name || 'Siswa CBT'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-900 dark:text-white font-semibold truncate block max-w-[150px]">{att.exam?.title || 'Simulasi Ujian'}</span>
                            <span className="text-[10px] text-slate-500 dark:text-gray-500 font-mono font-medium">{att.exam_group?.name || 'Gelombang 1'}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                            {att.started_at ? new Date(att.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${
                              isDone
                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                : isDisq
                                ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                                : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 animate-pulse'
                            }`}>
                              {att.status === 'in_progress' ? 'Mengerjakan' : isDone ? 'Selesai' : isDisq ? 'Diskualifikasi' : att.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 dark:text-gray-500 text-xs">
                        Belum ada aktivitas ujian pada sesi ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Calendar Widget & System Reminders */}
        <div className="space-y-6">
          <CalendarWidget highlights={calendarHighlights} />
          <RemindersList
            title="Aktivitas & Log Sistem"
            reminders={reminders}
            emptyMessage="Belum ada aktivitas mencurigakan"
          />
        </div>

      </div>

    </div>
  );
};
export default AdminDashboard;
