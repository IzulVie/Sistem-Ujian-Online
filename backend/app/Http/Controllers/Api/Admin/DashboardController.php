<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamGroup;
use App\Models\StudentExamAttempt;
use App\Models\ViolationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function liveMonitoring()
    {
        try {
            $activeAttemptsCount = StudentExamAttempt::where('status', 'in_progress')->count();
            $submittedAttemptsCount = StudentExamAttempt::whereIn('status', ['submitted', 'auto_submitted'])->count();
            $disqualifiedCount = StudentExamAttempt::where('status', 'disqualified')->count();

            // Get recent attempts with relationships
            $recentAttempts = StudentExamAttempt::with(['student.user', 'exam', 'examGroup'])
                ->latest()
                ->limit(10)
                ->get();

            // Get recent violation logs
            $recentViolations = ViolationLog::with(['attempt.student.user', 'attempt.exam'])
                ->latest()
                ->limit(15)
                ->get();

            return response()->json([
                'stats' => [
                    'active_attempts' => $activeAttemptsCount,
                    'submitted_attempts' => $submittedAttemptsCount,
                    'disqualified_attempts' => $disqualifiedCount,
                ],
                'recent_attempts' => $recentAttempts,
                'recent_violations' => $recentViolations
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'stats' => [
                    'active_attempts' => 0,
                    'submitted_attempts' => 0,
                    'disqualified_attempts' => 0,
                ],
                'recent_attempts' => [],
                'recent_violations' => [],
                'error' => $e->getMessage()
            ]);
        }
    }

    public function preFlightCheck()
    {
        // 1. Database Health & Latency
        $dbStatus = 'OK';
        $dbLatency = 0;
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $dbLatency = round((microtime(true) - $start) * 1000, 2);
        } catch (\Throwable $e) {
            $dbStatus = 'OFFLINE / UNREACHABLE';
        }

        // 2. Queue Status
        $pendingJobs = 0;
        $failedJobs = 0;
        $queueStatus = 'OK';
        if ($dbStatus === 'OK') {
            try {
                $pendingJobs = DB::table('jobs')->count();
                $failedJobs = DB::table('failed_jobs')->count();
            } catch (\Throwable $e) {
                $queueStatus = 'ERROR';
            }
        } else {
            $queueStatus = 'DATABASE_OFFLINE';
        }

        // 3. Cache Health & Latency
        $cacheStatus = 'OK';
        $cacheLatency = 0;
        if ($dbStatus === 'OK' || config('cache.default') !== 'database') {
            try {
                $start = microtime(true);
                Cache::put('_preflight_check', '1', 5);
                $cached = Cache::get('_preflight_check');
                $cacheLatency = round((microtime(true) - $start) * 1000, 2);
                if ($cached !== '1') {
                    $cacheStatus = 'MISMATCH';
                }
            } catch (\Throwable $e) {
                $cacheStatus = 'ERROR';
            }
        } else {
            $cacheStatus = 'DATABASE_OFFLINE';
        }

        // 4. Storage & Permissions
        $storagePath = storage_path('framework');
        $isWritable = is_writable($storagePath);
        $diskFree = @disk_free_space(storage_path());
        $diskFreeGb = $diskFree ? round($diskFree / (1024 * 1024 * 1024), 2) : null;

        // 5. Active Metrics
        $totalStudents = 0;
        $activeExams = 0;
        $activeAttempts = 0;
        if ($dbStatus === 'OK') {
            try {
                $totalStudents = \App\Models\Student::count();
                $activeExams = Exam::where('status', 'published')->count();
                $activeAttempts = StudentExamAttempt::where('status', 'in_progress')->count();
            } catch (\Throwable $e) {}
        }

        $allOk = ($dbStatus === 'OK') && ($cacheStatus === 'OK') && $isWritable;

        return response()->json([
            'status' => $allOk ? 'READY' : 'WARNING',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbStatus,
                'latency_ms' => $dbLatency,
                'connection' => config('database.default'),
            ],
            'queue' => [
                'status' => $queueStatus,
                'driver' => config('queue.default'),
                'pending_jobs' => $pendingJobs,
                'failed_jobs' => $failedJobs,
            ],
            'cache' => [
                'status' => $cacheStatus,
                'driver' => config('cache.default'),
                'latency_ms' => $cacheLatency,
            ],
            'storage' => [
                'writable' => $isWritable,
                'free_space_gb' => $diskFreeGb,
            ],
            'metrics' => [
                'total_students' => $totalStudents,
                'active_published_exams' => $activeExams,
                'active_attempts' => $activeAttempts,
            ]
        ]);
    }
}
