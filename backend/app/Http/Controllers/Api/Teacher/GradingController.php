<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\StudentExamAttempt;
use App\Models\StudentAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GradingController extends Controller
{
    // Retrieve list of student attempts for an exam
    public function examAttempts(Request $request, $examId)
    {
        $attempts = StudentExamAttempt::where('exam_id', $examId)
            ->with(['student.user', 'examGroup'])
            ->latest()
            ->get();

        return response()->json($attempts);
    }

    // Retrieve full answers for manual grading
    public function showAttemptAnswers($attemptId)
    {
        $attempt = StudentExamAttempt::with(['student.user', 'exam', 'answers.questionBank'])
            ->findOrFail($attemptId);

        return response()->json($attempt);
    }

    // Grade an individual essay answer
    public function gradeAnswer(Request $request, $answerId)
    {
        $request->validate([
            'score' => 'required|numeric|min:0',
        ]);

        $teacher = $request->user()->teacher;
        if (!$teacher) {
            return response()->json(['message' => 'Hanya guru yang dapat menilai essay.'], 403);
        }

        $answer = StudentAnswer::with('questionBank')->findOrFail($answerId);
        $attempt = StudentExamAttempt::findOrFail($answer->attempt_id);

        // Get question weight
        $pivot = DB::table('exam_questions')
            ->where('exam_id', $attempt->exam_id)
            ->where('question_bank_id', $answer->question_bank_id)
            ->first();
        $weight = $pivot ? $pivot->weight : 1;

        if ($request->score > $weight) {
            return response()->json(['message' => "Nilai melebihi bobot maksimum soal ({$weight})."], 422);
        }

        DB::transaction(function () use ($request, $answer, $attempt, $teacher) {
            $answer->update([
                'score' => $request->score,
                'graded_by' => $teacher->id,
                'graded_at' => now(),
            ]);

            // Recalculate total score for attempt
            $this->recalculateAttemptScore($attempt);
        });

        return response()->json([
            'message' => 'Nilai essay disimpan.',
            'answer' => $answer
        ]);
    }

    private function recalculateAttemptScore($attempt)
    {
        $attempt->load(['answers.questionBank', 'exam']);
        $totalWeight = 0;
        $totalEarned = 0;
        $allGraded = true;

        foreach ($attempt->answers as $ans) {
            $pivot = DB::table('exam_questions')
                ->where('exam_id', $attempt->exam_id)
                ->where('question_bank_id', $ans->question_bank_id)
                ->first();
            $weight = $pivot ? $pivot->weight : 1;
            $totalWeight += $weight;

            if ($ans->score !== null) {
                $totalEarned += $ans->score;
            } else {
                $allGraded = false; // There is still an ungraded essay
            }
        }

        $scorePercent = $totalWeight > 0 ? ($totalEarned / $totalWeight) * 100 : 0;
        
        $updateData = [];
        if ($allGraded) {
            $updateData['total_score'] = $scorePercent;
            $updateData['is_passed'] = $scorePercent >= $attempt->exam->kkm_score;
        } else {
            // Keep total score null until all essay parts are graded
            $updateData['total_score'] = null;
            $updateData['is_passed'] = null;
        }

        $attempt->update($updateData);
    }
}
