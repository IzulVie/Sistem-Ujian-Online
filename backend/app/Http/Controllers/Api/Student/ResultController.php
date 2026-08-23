<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\StudentExamAttempt;
use Illuminate\Http\Request;

class ResultController extends Controller
{
    public function showResult(Request $request, $attemptId)
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        $attempt = StudentExamAttempt::where('student_id', $student->id)
            ->with(['exam.subject', 'examGroup', 'answers.questionBank.options'])
            ->findOrFail($attemptId);

        $exam = $attempt->exam;

        // Hide results if option is disabled in settings and the exam window is still open
        $showResults = $exam->settings['show_result_immediately'] ?? false;
        $now = now();
        $isClosed = $now->gt($exam->end_time);

        if (!$showResults && !$isClosed) {
            return response()->json([
                'attempt' => [
                    'id' => $attempt->id,
                    'status' => $attempt->status,
                    'started_at' => $attempt->started_at,
                    'submitted_at' => $attempt->submitted_at,
                    'total_score' => null, // Hidden
                    'is_passed' => null,   // Hidden
                ],
                'message' => 'Hasil ujian akan diumumkan setelah waktu pengerjaan berakhir.',
                'results_hidden' => true
            ]);
        }

        // Return full attempt details
        return response()->json([
            'attempt' => $attempt,
            'results_hidden' => false
        ]);
    }
}
