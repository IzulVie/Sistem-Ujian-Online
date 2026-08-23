<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\StudentExamAttempt;
use App\Models\StudentAnswer;
use Illuminate\Http\Request;

class AnswerController extends Controller
{
    public function saveAnswer(Request $request, $attemptId)
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        $attempt = StudentExamAttempt::where('student_id', $student->id)->findOrFail($attemptId);

        if ($attempt->status !== 'in_progress') {
            return response()->json(['message' => 'Sesi ujian ini telah ditutup. Tidak dapat menyimpan jawaban.'], 403);
        }

        $request->validate([
            'question_id' => 'required|exists:question_banks,id',
            'answer_content' => 'nullable|array',
            'is_flagged' => 'required|boolean',
        ]);

        $answerContent = $request->answer_content;
        if (is_array($answerContent) && isset($answerContent['essay_text']) && is_string($answerContent['essay_text'])) {
            $answerContent['essay_text'] = strip_tags($answerContent['essay_text']);
        }

        $answer = \Illuminate\Support\Facades\DB::transaction(function () use ($attempt, $request, $answerContent) {
            $ans = StudentAnswer::firstOrCreate(
                [
                    'attempt_id' => $attempt->id,
                    'question_bank_id' => $request->question_id
                ],
                [
                    'answer_content' => null,
                    'is_flagged' => false
                ]
            );

            $ans->update([
                'answer_content' => $answerContent,
                'is_flagged' => $request->is_flagged,
            ]);

            return $ans;
        });

        return response()->json([
            'message' => 'Jawaban disimpan.',
            'data' => $answer
        ]);
    }
}
