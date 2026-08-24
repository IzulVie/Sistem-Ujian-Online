<?php

use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\SessionController;
use App\Http\Controllers\Api\Admin\MajorController;
use App\Http\Controllers\Api\Admin\ClassController;
use App\Http\Controllers\Api\Admin\SubjectController;
use App\Http\Controllers\Api\Admin\AcademicYearController;
use App\Http\Controllers\Api\Admin\TeacherController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Teacher\QuestionPackageController;
use App\Http\Controllers\Api\Teacher\QuestionBankController;
use App\Http\Controllers\Api\Teacher\QuestionImportController;
use App\Http\Controllers\Api\Teacher\ExamController;
use App\Http\Controllers\Api\Teacher\ExamGroupController;
use App\Http\Controllers\Api\Teacher\GradingController;
use App\Http\Controllers\Api\Student\ExamAttemptController;
use App\Http\Controllers\Api\Student\AnswerController;
use App\Http\Controllers\Api\Student\ResultController;
use App\Http\Controllers\Api\Proctoring\ViolationLogController;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::post('/auth/login', [LoginController::class, 'login'])->middleware('throttle:15,1');

// Protected routes (Requires Auth & Session Lock check)
Route::middleware(['auth:sanctum', 'single_session'])->group(function () {
    Route::get('/auth/me', [SessionController::class, 'me']);
    Route::post('/auth/logout', [LoginController::class, 'logout']);

    // Admin-only Master Data management routes
    Route::middleware(['role:super_admin|admin'])->prefix('admin')->group(function () {
        Route::apiResource('majors', MajorController::class);
        Route::apiResource('classes', ClassController::class);
        Route::apiResource('subjects', SubjectController::class);
        
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::apiResource('academic-years', AcademicYearController::class);
        
        Route::apiResource('teachers', TeacherController::class);
        Route::post('students/import', [StudentController::class, 'import']);
        Route::apiResource('students', StudentController::class);

        // Live monitor & pre-flight system health check
        Route::get('dashboard/live-monitoring', [DashboardController::class, 'liveMonitoring']);
        Route::get('dashboard/pre-flight-check', [DashboardController::class, 'preFlightCheck']);
    });

    // Teacher Bank Soal & Exam management routes
    Route::middleware(['role:guru|super_admin|admin'])->prefix('teacher')->group(function () {
        Route::get('subjects', [SubjectController::class, 'index']);
        Route::get('classes', [ClassController::class, 'index']);
        Route::get('students', [StudentController::class, 'index']);

        Route::post('packages/{package}/duplicate', [QuestionPackageController::class, 'duplicate']);
        Route::apiResource('packages', QuestionPackageController::class);

        Route::get('questions/template', [QuestionImportController::class, 'downloadTemplate']);
        Route::get('questions/template/word', [QuestionImportController::class, 'downloadWordTemplate']);
        Route::post('questions/import', [QuestionImportController::class, 'import']);
        Route::apiResource('questions', QuestionBankController::class);

        // Exams & Groups CRUD
        Route::apiResource('exams', ExamController::class);
        Route::apiResource('exam-groups', ExamGroupController::class);

        // Sessional grading endpoints
        Route::get('exams/{exam}/attempts', [GradingController::class, 'examAttempts']);
        Route::get('attempts/{attempt}', [GradingController::class, 'showAttemptAnswers']);
        Route::post('answers/{answer}/grade', [GradingController::class, 'gradeAnswer']);

        // Exam Analytics & Results Reporting endpoints
        Route::get('exams/{exam}/report', [\App\Http\Controllers\Api\Teacher\ExamReportController::class, 'getExamReport']);
        Route::get('exams/{exam}/report/export', [\App\Http\Controllers\Api\Teacher\ExamReportController::class, 'exportCsv']);
    });

    // Student Exam pengerjaan routes with High-Throughput Burst Rate Limiting
    Route::middleware(['role:siswa'])->prefix('student')->group(function () {
        Route::get('exams', [ExamAttemptController::class, 'availableExams']);
        Route::post('attempts/start', [ExamAttemptController::class, 'start'])->middleware('throttle:30,1');
        Route::get('attempts/{attempt}', [ExamAttemptController::class, 'showAttempt']);
        Route::get('attempts/{attempt}/questions', [ExamAttemptController::class, 'showAttempt']);
        Route::patch('attempts/{attempt}/answers', [AnswerController::class, 'saveAnswer'])->middleware('throttle:180,1');
        Route::post('attempts/{attempt}/submit', [ExamAttemptController::class, 'submit'])->middleware('throttle:20,1');
        Route::post('attempts/{attempt}/disqualify', [ViolationLogController::class, 'disqualify']);
        Route::post('attempts/{attempt}/violations', [ViolationLogController::class, 'logViolation'])->middleware('throttle:60,1');
        Route::post('attempts/violations', [ViolationLogController::class, 'logViolation'])->middleware('throttle:60,1');
        Route::get('results/{attempt}', [ResultController::class, 'showResult']);
    });
});
