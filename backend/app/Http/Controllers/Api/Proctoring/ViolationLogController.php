<?php

namespace App\Http\Controllers\Api\Proctoring;

use App\Http\Controllers\Controller;
use App\Models\StudentExamAttempt;
use App\Models\ViolationLog;
use Illuminate\Http\Request;

class ViolationLogController extends Controller
{
    public function logViolation(Request $request, $attempt = null)
    {
        $resolvedAttemptId = $attempt ?: $request->route('attempt') ?: $request->input('attempt_id') ?: $request->input('attempt');

        if (!$resolvedAttemptId) {
            return response()->json(['message' => 'ID sesi pengerjaan (attempt_id) wajib disertakan.'], 422);
        }

        $type = $request->input('violation_type', $request->input('type', 'tab_switch'));

        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        // Verify attempt belongs to the student
        $attempt = StudentExamAttempt::with('exam')->where('student_id', $student->id)->findOrFail($resolvedAttemptId);

        if ($attempt->status !== 'in_progress') {
            return response()->json(['message' => 'Ujian tidak aktif atau telah diserahkan sebelumnya.'], 403);
        }

        $log = ViolationLog::create([
            'attempt_id' => $attempt->id,
            'type' => $type,
            'occurred_at' => now(),
            'metadata' => $request->input('metadata', []),
        ]);

        // Auto submit / Disqualify if student switches tab or focus too many times
        $violationsCount = ViolationLog::where('attempt_id', $attempt->id)
            ->whereIn('type', ['tab_switch', 'window_blur', 'fullscreen_exit'])
            ->count();

        $maxAllowed = isset($attempt->exam->settings['max_tab_switches'])
            ? (int) $attempt->exam->settings['max_tab_switches']
            : 5;

        $attempt->update([
            'tab_switch_count' => $violationsCount
        ]);

        $shouldDisqualify = $request->boolean('is_disqualified') 
            || $request->boolean('force_disqualify') 
            || ($violationsCount >= $maxAllowed);

        if ($shouldDisqualify) {
            $attempt->update([
                'status' => 'disqualified',
                'total_score' => 0,
                'tab_switch_count' => max($violationsCount, $maxAllowed),
                'submitted_at' => now(),
                'time_remaining_seconds' => 0
            ]);

            return response()->json([
                'message' => 'Anda telah didiskualifikasi karena melebihi batas perpindahan tab/jendela yang diizinkan.',
                'is_disqualified' => true,
                'disqualified' => true,
                'tab_switch_count' => max($violationsCount, $maxAllowed),
                'violations_count' => max($violationsCount, $maxAllowed),
                'max_allowed' => $maxAllowed,
                'data' => $log
            ], 200);
        }

        return response()->json([
            'message' => 'Pelanggaran tercatat.',
            'is_disqualified' => false,
            'disqualified' => false,
            'tab_switch_count' => $violationsCount,
            'violations_count' => $violationsCount,
            'max_allowed' => $maxAllowed,
            'data' => $log
        ]);
    }

    public function disqualify(Request $request, $attempt = null)
    {
        $resolvedAttemptId = $attempt ?: $request->route('attempt') ?: $request->input('attempt_id') ?: $request->input('attempt');

        if (!$resolvedAttemptId) {
            return response()->json(['message' => 'ID sesi pengerjaan (attempt_id) wajib disertakan.'], 422);
        }

        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        $attemptModel = StudentExamAttempt::with('exam')->where('student_id', $student->id)->findOrFail($resolvedAttemptId);

        $attemptModel->update([
            'status' => 'disqualified',
            'total_score' => 0,
            'submitted_at' => now(),
            'time_remaining_seconds' => 0
        ]);

        return response()->json([
            'message' => 'Sesi ujian telah didiskualifikasi secara permanen.',
            'is_disqualified' => true,
            'disqualified' => true,
            'status' => 'disqualified',
            'score' => 0,
            'attempt' => $attemptModel
        ], 200);
    }
}
