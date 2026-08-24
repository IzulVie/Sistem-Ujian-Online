<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\StudentExamAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExamReportController extends Controller
{
    /**
     * Get comprehensive exam report and analytics
     */
    public function getExamReport(Request $request, $examId)
    {
        $exam = Exam::with(['subject', 'academicYear', 'package', 'questions'])
            ->findOrFail($examId);

        $kkm = $exam->kkm_score ?? 75;

        // Fetch all attempts for this exam with related data
        $attempts = StudentExamAttempt::where('exam_id', $examId)
            ->with([
                'student.user',
                'student.classRoom',
                'student.major',
                'answers.questionBank',
                'violations',
                'examGroup'
            ])
            ->get();

        $totalQuestions = $exam->questions->count();
        $totalWeight = $exam->questions->sum(fn($q) => $q->pivot->weight ?? 1) ?: 1;

        // Calculate Overview Statistics
        $totalParticipants = $attempts->count();
        $completedAttempts = $attempts->whereIn('status', ['submitted', 'auto_submitted']);
        $disqualifiedAttempts = $attempts->where('status', 'disqualified');
        $inProgressAttempts = $attempts->where('status', 'in_progress');
        $notStartedCount = $attempts->where('status', 'not_started')->count();

        $scores = $attempts->whereNotNull('total_score')->pluck('total_score')->map(fn($s) => (float)$s)->values();

        $avgScore = $scores->count() > 0 ? round($scores->avg(), 2) : 0;
        $maxScore = $scores->count() > 0 ? round($scores->max(), 2) : 0;
        $minScore = $scores->count() > 0 ? round($scores->min(), 2) : 0;

        $passedCount = $scores->filter(fn($s) => $s >= $kkm)->count();
        $remedialCount = $scores->filter(fn($s) => $s < $kkm)->count();
        $passRate = $scores->count() > 0 ? round(($passedCount / $scores->count()) * 100, 1) : 0;

        // Score Distribution Ranges
        $distribution = [
            'range_0_20' => $scores->filter(fn($s) => $s >= 0 && $s <= 20)->count(),
            'range_21_40' => $scores->filter(fn($s) => $s > 20 && $s <= 40)->count(),
            'range_41_60' => $scores->filter(fn($s) => $s > 40 && $s <= 60)->count(),
            'range_61_80' => $scores->filter(fn($s) => $s > 60 && $s <= 80)->count(),
            'range_81_100' => $scores->filter(fn($s) => $s > 80 && $s <= 100)->count(),
        ];

        // Format Student Rankings and Scores List
        $sortedAttempts = $attempts->sortByDesc(function ($att) {
            return $att->total_score ?? -1;
        })->values();

        $studentsReport = [];
        $rank = 1;

        foreach ($sortedAttempts as $att) {
            $student = $att->student;
            $user = $student?->user;

            $durationMinutes = null;
            if ($att->started_at && $att->submitted_at) {
                $durationMinutes = round($att->started_at->diffInMinutes($att->submitted_at), 1);
            }

            // Count correct / incorrect / empty answers
            $answeredCount = $att->answers->count();
            $correctCount = 0;
            $incorrectCount = 0;

            foreach ($att->answers as $ans) {
                if ($ans->score !== null && $ans->score > 0) {
                    $correctCount++;
                } else {
                    $incorrectCount++;
                }
            }

            $unansweredCount = max(0, $totalQuestions - $answeredCount);
            $score = $att->total_score !== null ? (float)$att->total_score : null;
            $isPassed = $score !== null ? ($score >= $kkm) : false;

            $studentsReport[] = [
                'rank' => $rank++,
                'attempt_id' => $att->id,
                'student_id' => $student?->id,
                'name' => $user?->name ?? 'Siswa Tanpa Nama',
                'username' => $user?->username ?? '-',
                'nisn' => $student?->nisn ?? '-',
                'nis' => $student?->nis ?? '-',
                'class_name' => $student?->classRoom?->name ?? 'Semua Kelas',
                'major_name' => $student?->major?->name ?? '-',
                'status' => $att->status,
                'total_score' => $score,
                'is_passed' => $isPassed,
                'started_at' => $att->started_at?->format('Y-m-d H:i:s'),
                'submitted_at' => $att->submitted_at?->format('Y-m-d H:i:s'),
                'duration_minutes' => $durationMinutes,
                'correct_count' => $correctCount,
                'incorrect_count' => $incorrectCount,
                'unanswered_count' => $unansweredCount,
                'violation_count' => $att->violations->count(),
            ];
        }

        // Calculate Question Item Analysis (Analisis Butir Soal)
        $questionsAnalysis = [];
        $totalSubmittedAttempts = max(1, $completedAttempts->count() + $disqualifiedAttempts->count());

        foreach ($exam->questions as $index => $q) {
            $questionAnswers = DB::table('student_answers')
                ->join('student_exam_attempts', 'student_answers.attempt_id', '=', 'student_exam_attempts.id')
                ->where('student_exam_attempts.exam_id', $examId)
                ->where('student_answers.question_bank_id', $q->id)
                ->get();

            $totalAnswered = $questionAnswers->count();
            $correctCount = $questionAnswers->filter(fn($a) => $a->score !== null && $a->score > 0)->count();
            $incorrectCount = $questionAnswers->filter(fn($a) => $a->score === null || $a->score == 0)->count();
            $unansweredCount = max(0, $totalSubmittedAttempts - $totalAnswered);

            $accuracyRate = round(($correctCount / $totalSubmittedAttempts) * 100, 1);

            // Determine difficulty status
            $category = 'Sedang';
            if ($accuracyRate >= 80) {
                $category = 'Mudah';
            } elseif ($accuracyRate <= 40) {
                $category = 'Sukar / Sulit';
            }

            $questionsAnalysis[] = [
                'number' => $index + 1,
                'question_id' => $q->id,
                'type' => $q->type,
                'content_preview' => mb_substr(strip_tags($q->content), 0, 100) . '...',
                'topic' => $q->topic ?? 'Umum',
                'difficulty' => $q->difficulty,
                'weight' => $q->pivot->weight ?? 1,
                'total_answered' => $totalAnswered,
                'correct_count' => $correctCount,
                'incorrect_count' => $incorrectCount,
                'unanswered_count' => $unansweredCount,
                'accuracy_rate' => $accuracyRate,
                'performance_category' => $category,
            ];
        }

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'title' => $exam->title,
                'subject_name' => $exam->subject?->name ?? 'Semua Mapel',
                'subject_code' => $exam->subject?->code ?? '-',
                'academic_year' => $exam->academicYear?->name ?? '-',
                'duration_minutes' => $exam->duration_minutes,
                'start_time' => $exam->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $exam->end_time?->format('Y-m-d H:i:s'),
                'kkm_score' => $kkm,
                'status' => $exam->status,
                'total_questions' => $totalQuestions,
                'total_weight' => $totalWeight,
            ],
            'statistics' => [
                'total_participants' => $totalParticipants,
                'completed_count' => $completedAttempts->count(),
                'in_progress_count' => $inProgressAttempts->count(),
                'disqualified_count' => $disqualifiedAttempts->count(),
                'not_started_count' => $notStartedCount,
                'average_score' => $avgScore,
                'highest_score' => $maxScore,
                'lowest_score' => $minScore,
                'passed_count' => $passedCount,
                'remedial_count' => $remedialCount,
                'pass_rate_percent' => $passRate,
                'score_distribution' => $distribution,
            ],
            'students' => $studentsReport,
            'item_analysis' => $questionsAnalysis,
        ]);
    }

    /**
     * Export student exam scores to CSV (Excel compatible)
     */
    public function exportCsv(Request $request, $examId): StreamedResponse
    {
        $exam = Exam::with(['subject'])->findOrFail($examId);
        $kkm = $exam->kkm_score ?? 75;

        $attempts = StudentExamAttempt::where('exam_id', $examId)
            ->with(['student.user', 'student.classRoom', 'violations', 'answers'])
            ->get()
            ->sortByDesc(fn($a) => $a->total_score ?? -1);

        $filename = 'Laporan_Hasil_Ujian_' . str_replace(' ', '_', $exam->title) . '_' . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($exam, $attempts, $kkm) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM for Microsoft Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Metadata info rows
            fputcsv($handle, ['REKAPITULASI HASIL UJIAN CBT'], ';');
            fputcsv($handle, ['Nama Ujian', $exam->title], ';');
            fputcsv($handle, ['Mata Pelajaran', $exam->subject?->name ?? '-'], ';');
            fputcsv($handle, ['KKM Standar', $kkm], ';');
            fputcsv($handle, ['Tanggal Ekspor', date('d-m-Y H:i:s')], ';');
            fputcsv($handle, [], ';');

            // Table Header row
            fputcsv($handle, [
                'Peringkat',
                'NISN',
                'NIS',
                'Nama Siswa',
                'Kelas',
                'Nilai Akhir',
                'Status Kelulusan',
                'Status Pengerjaan',
                'Jumlah Benar',
                'Jumlah Salah',
                'Pelanggaran Proctoring',
                'Waktu Mulai',
                'Waktu Selesai',
                'Durasi (Menit)'
            ], ';');

            $rank = 1;
            foreach ($attempts as $att) {
                $score = $att->total_score !== null ? (float)$att->total_score : null;
                $isPassed = $score !== null ? ($score >= $kkm ? 'LULUS' : 'REMEDIAL') : 'BELUM SELESAI';
                
                $correctCount = $att->answers->filter(fn($a) => $a->score !== null && $a->score > 0)->count();
                $incorrectCount = $att->answers->filter(fn($a) => $a->score === null || $a->score == 0)->count();

                $duration = null;
                if ($att->started_at && $att->submitted_at) {
                    $duration = round($att->started_at->diffInMinutes($att->submitted_at), 1);
                }

                fputcsv($handle, [
                    $rank++,
                    $att->student?->nisn ?? '-',
                    $att->student?->nis ?? '-',
                    $att->student?->user?->name ?? 'Siswa',
                    $att->student?->classRoom?->name ?? '-',
                    $score !== null ? number_format($score, 2, ',', '.') : '0',
                    $isPassed,
                    ucfirst(str_replace('_', ' ', $att->status)),
                    $correctCount,
                    $incorrectCount,
                    $att->violations->count(),
                    $att->started_at?->format('d/m/Y H:i:s') ?? '-',
                    $att->submitted_at?->format('d/m/Y H:i:s') ?? '-',
                    $duration !== null ? $duration : '-'
                ], ';');
            }

            fclose($handle);
        }, 200, $headers);
    }
}
