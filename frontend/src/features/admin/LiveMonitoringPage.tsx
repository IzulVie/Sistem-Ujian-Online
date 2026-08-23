import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';
import { ShieldAlert, CheckCircle2, User, AlertCircle, RefreshCw } from 'lucide-react';

interface Attempt {
  id: number;
  student?: {
    user?: {
      name: string;
    };
  };
  exam?: {
    title: string;
  };
  exam_group?: {
    name: string;
  };
  status: string;
  started_at: string;
}

interface Violation {
  id: number;
  type: 'tab_switch' | 'fullscreen_exit' | 'copy_paste_attempt' | 'multiple_login';
  occurred_at: string;
  attempt?: {
    student?: {
      user?: {
        name: string;
      };
    };
    exam?: {
      title: string;
    };
  };
  metadata?: any;
}

interface PreFlightData {
  status: 'READY' | 'WARNING';
  timestamp: string;
  database: { status: string; latency_ms: number; connection: string };
  queue: { status: string; driver: string; pending_jobs: number; failed_jobs: number };
  cache: { status: string; driver: string; latency_ms: number };
  storage: { writable: boolean; free_space_gb: number | null };
  metrics: { total_students: number; active_published_exams: number; active_attempts: number };
}

export const LiveMonitoringPage: React.FC = () => {
  const [stats, setStats] = useState({
    active_attempts: 0,
    submitted_attempts: 0,
    disqualified_attempts: 0,
  });
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [recentViolations, setRecentViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-flight check state
  const [preFlight, setPreFlight] = useState<PreFlightData | null>(null);
  const [checkingPreFlight, setCheckingPreFlight] = useState(false);
  const [showPreFlightModal, setShowPreFlightModal] = useState(false);

  const fetchLiveStats = async () => {
    try {
      const res = await apiClient.get('/admin/dashboard/live-monitoring');
      setStats(res.data.stats);
      setRecentAttempts(res.data.recent_attempts);
      setRecentViolations(res.data.recent_violations);
    } catch (err) {
      console.error('Failed to poll live monitoring stats:', err);
    }
  };

  const runPreFlightCheck = async () => {
    setCheckingPreFlight(true);
    setShowPreFlightModal(true);
    try {
      const res = await apiClient.get('/admin/dashboard/pre-flight-check');
      setPreFlight(res.data);
    } catch (err) {
      console.error('Failed to run pre-flight check:', err);
    } finally {
      setCheckingPreFlight(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLiveStats().finally(() => setLoading(false));

    // Poll stats every 5 seconds for real-time tracking
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getViolationBadgeColor = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'fullscreen_exit':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'copy_paste_attempt':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      case 'multiple_login':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20';
    }
  };

  const getViolationLabel = (type: string) => {
    switch (type) {
      case 'tab_switch': return 'Pindah Tab Browser';
      case 'fullscreen_exit': return 'Keluar Fullscreen';
      case 'copy_paste_attempt': return 'Mencoba Copy-Paste';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <span>Live Monitoring & Proctoring</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Pemantauan real-time integritas siswa dan log insiden kecurangan secara instan.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={runPreFlightCheck}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-sm transition"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Pre-Flight Diagnosa Sistem</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 glass-panel rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Polling Aktif (5s)</span>
          </div>
        </div>
      </div>

      {/* Pre-Flight Modal */}
      {showPreFlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Pre-Flight System Check</h3>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">Pemeriksaan kesiapan infrastruktur ujian</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreFlightModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {checkingPreFlight ? (
              <div className="py-10 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs font-medium text-slate-600 dark:text-gray-300">Menjalankan pengujian koneksi database, queue, cache, dan penyimpanan...</p>
              </div>
            ) : preFlight ? (
              <div className="space-y-3 text-xs">
                <div className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                  preFlight.status === 'READY'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                    : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                }`}>
                  <span className="font-bold">Kesiapan Sistem CBT:</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 shadow-xs">
                    {preFlight.status === 'READY' ? '✅ SIAP UNTUK UJIAN' : '⚠️ PERLU PERHATIAN'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
                    <p className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase">Database ({preFlight.database.connection})</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Status: {preFlight.database.status}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Latency: {preFlight.database.latency_ms} ms</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
                    <p className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase">Cache Memory ({preFlight.cache.driver})</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Status: {preFlight.cache.status}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Latency: {preFlight.cache.latency_ms} ms</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
                    <p className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase">Queue Worker ({preFlight.queue.driver})</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Status: {preFlight.queue.status}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Pending: {preFlight.queue.pending_jobs} jobs</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
                    <p className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase">Storage Server</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">I/O Write: {preFlight.storage.writable ? 'Izin OK' : 'Gagal'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Free: {preFlight.storage.free_space_gb ?? 'N/A'} GB</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500 dark:text-gray-400 border-t border-slate-100 dark:border-white/5">
                  <span>Total Siswa Terdaftar: <strong>{preFlight.metrics.total_students}</strong></span>
                  <span>Ujian Aktif: <strong>{preFlight.metrics.active_published_exams}</strong></span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPreFlightModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
              <button
                onClick={runPreFlightCheck}
                disabled={checkingPreFlight}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Uji Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Metrics Cards or Skeleton */}
      {loading ? (
        <CardGridSkeleton count={3} cols="grid-cols-1 md:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <div className="glass-panel p-6 rounded-3xl flex items-start gap-4 border-l-4 border-indigo-500 shadow-sm">
            <div className="p-3.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Siswa Aktif Mengerjakan</h3>
              <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">{stats.active_attempts} Orang</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl flex items-start gap-4 border-l-4 border-emerald-500 shadow-sm">
            <div className="p-3.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Lembar Terkumpul</h3>
              <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">{stats.submitted_attempts} Siswa</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl flex items-start gap-4 border-l-4 border-rose-500 shadow-sm">
            <div className="p-3.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Diskualifikasi Keamanan</h3>
              <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">{stats.disqualified_attempts} Siswa</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active attempts table */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider px-1">
            Aktivitas Pengerjaan Terbaru
          </h3>
          <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Nama Siswa</th>
                    <th className="px-5 py-3.5">Ujian</th>
                    <th className="px-5 py-3.5">Gelombang</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                  {recentAttempts.length > 0 ? (
                    recentAttempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                              {att.student?.user?.name ? att.student.user.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <span>{att.student?.user?.name || 'Siswa CBT'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 truncate max-w-[180px] font-medium text-slate-800 dark:text-gray-200">
                          {att.exam?.title || 'Simulasi Ujian'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-gray-400">
                          {att.exam_group?.name || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${
                            att.status === 'in_progress'
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 animate-pulse'
                              : att.status === 'disqualified'
                              ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          }`}>
                            {att.status === 'in_progress' ? 'Mengerjakan' : att.status === 'submitted' ? 'Selesai' : att.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-gray-500">
                        Tidak ada aktivitas pengerjaan ujian yang sedang berlangsung.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-time violations alert feed */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider px-1">
            Log Pelanggaran Keamanan
          </h3>
          <div className="glass-panel p-4 rounded-3xl max-h-[50vh] overflow-y-auto space-y-2.5 shadow-xl">
            {recentViolations.length > 0 ? (
              recentViolations.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-1.5 transition hover:border-indigo-300 dark:hover:border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                      {v.attempt?.student?.user?.name || 'Siswa'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-gray-500 font-mono">
                      {new Date(v.occurred_at).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-lg ${getViolationBadgeColor(v.type)}`}>
                      {getViolationLabel(v.type)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono truncate max-w-[110px]" title={v.attempt?.exam?.title}>
                      {v.attempt?.exam?.title}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-gray-500 text-xs font-medium">
                Belum ada insiden proctoring tercatat
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default LiveMonitoringPage;
