<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Services\AutoGradingService;
use App\Models\StudentExamAttempt;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('cbt:verify-upgrade', function () {
    $this->info('=== 1. VERIFYING PRE-FLIGHT CHECK CONTROLLER ===');
    $dashboardController = new DashboardController();
    $response = $dashboardController->preFlightCheck();
    $data = $response->getData(true);
    
    $this->line('Overall Status: ' . $data['status']);
    $this->line('Database Status: ' . $data['database']['status'] . ' (Latency: ' . $data['database']['latency_ms'] . ' ms)');
    $this->line('Queue Status: ' . $data['queue']['status'] . ' (Pending: ' . $data['queue']['pending_jobs'] . ' jobs)');
    $this->line('Cache Status: ' . $data['cache']['status'] . ' (Latency: ' . $data['cache']['latency_ms'] . ' ms)');
    $this->line('Storage Writable: ' . ($data['storage']['writable'] ? 'YES' : 'NO') . ' (Free: ' . ($data['storage']['free_space_gb'] ?? 'N/A') . ' GB)');

    $this->info("\n=== 2. VERIFYING AUTO GRADING SERVICE ===");
    $gradingService = new AutoGradingService();
    $attempt = StudentExamAttempt::first();
    if ($attempt) {
        $gradeResult = $gradingService->gradeAttempt($attempt);
        $this->line("Attempt #{$attempt->id} Graded Successfully: " . json_encode($gradeResult));
    } else {
        $this->comment("No student exam attempt in database to grade.");
    }

    $this->info("\n=== ALL UPGRADE CHECKS COMPLETED SUCCESSFULLY ===");
})->purpose('Verify CBT upgrade and health check status');

Artisan::command('cbt:clean-dummy-data', function () {
    $this->warn('Clearing dummy exams, question banks, and student attempts while preserving user accounts...');

    DB::statement('SET FOREIGN_KEY_CHECKS=0;');

    $tablesToTruncate = [
        'violation_logs',
        'student_answers',
        'student_exam_attempts',
        'exam_group_students',
        'exam_questions',
        'exam_groups',
        'exams',
        'question_matching_pairs',
        'question_options',
        'question_packages',
        'question_banks',
    ];

    foreach ($tablesToTruncate as $table) {
        if (Schema::hasTable($table)) {
            DB::table($table)->truncate();
            $this->line(" - Table `{$table}` cleared.");
        }
    }

    DB::statement('SET FOREIGN_KEY_CHECKS=1;');

    $this->info("\n=== All dummy questions and exam schedules cleared successfully! Users, Classes & Majors are preserved. ===");
})->purpose('Clear dummy questions and exams while preserving users');

// =========================================================================
// HOSTINGER CLOUD STARTUP SCHEDULED TASKS
// Triggered by hPanel Cron: * * * * * php /path/to/backend/artisan schedule:run
// =========================================================================

// 1. Auto-process auto-grading queue jobs with memory ceiling (128MB) and 50s timeout
Schedule::command('queue:work --stop-when-empty --max-time=50 --memory=128')
    ->everyMinute()
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/queue-worker.log'));
