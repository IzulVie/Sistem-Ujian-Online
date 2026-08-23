<?php

namespace App\Services;

use App\Models\StudentExamAttempt;
use App\Models\StudentAnswer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoGradingService
{
    /**
     * Calculate and save scores for an exam attempt.
     *
     * @param StudentExamAttempt $attempt
     * @return array
     */
    public function gradeAttempt(StudentExamAttempt $attempt): array
    {
        $attempt->loadMissing([
            'answers.questionBank.options',
            'answers.questionBank.matchingPairs',
            'exam'
        ]);

        $exam = $attempt->exam;
        if (!$exam) {
            Log::error("AutoGradingService: Exam not found for attempt {$attempt->id}");
            return [
                'total_score' => null,
                'is_passed' => null,
                'has_essay' => false,
            ];
        }

        // Pre-fetch question weights in a single query to avoid N+1
        $weights = DB::table('exam_questions')
            ->where('exam_id', $attempt->exam_id)
            ->pluck('weight', 'question_bank_id')
            ->all();

        $totalWeight = 0;
        $totalEarned = 0;
        $hasEssay = false;

        foreach ($attempt->answers as $ans) {
            $q = $ans->questionBank;
            if (!$q) {
                continue;
            }

            $weight = $weights[$q->id] ?? 1;
            $totalWeight += $weight;
            $scoreEarned = 0;

            switch ($q->type) {
                case 'multiple_choice_single':
                    $chosenOptionId = $ans->answer_content['option_id'] ?? null;
                    $correctOption = $q->options->firstWhere('is_correct', true);
                    if ($chosenOptionId && $correctOption && (string) $correctOption->id === (string) $chosenOptionId) {
                        $scoreEarned = $weight;
                    }
                    $ans->update(['score' => $scoreEarned]);
                    $totalEarned += $scoreEarned;
                    break;

                case 'true_false':
                    $chosenText = $ans->answer_content['text'] ?? null;
                    $correctOption = $q->options->firstWhere('is_correct', true);
                    if ($chosenText && $correctOption && strcasecmp(trim($correctOption->content), trim($chosenText)) === 0) {
                        $scoreEarned = $weight;
                    }
                    $ans->update(['score' => $scoreEarned]);
                    $totalEarned += $scoreEarned;
                    break;

                case 'multiple_choice_multi':
                    $chosenOptionIds = (array) ($ans->answer_content['option_ids'] ?? []);
                    $correctOptionIds = $q->options->where('is_correct', true)->pluck('id')->all();

                    $chosenSorted = array_map('intval', $chosenOptionIds);
                    $correctSorted = array_map('intval', $correctOptionIds);
                    sort($chosenSorted);
                    sort($correctSorted);

                    if (!empty($chosenSorted) && $chosenSorted === $correctSorted) {
                        $scoreEarned = $weight;
                    }
                    $ans->update(['score' => $scoreEarned]);
                    $totalEarned += $scoreEarned;
                    break;

                case 'matching':
                    $userMatches = (array) ($ans->answer_content['matches'] ?? []);
                    $correctPairs = $q->matchingPairs;
                    $pairCount = count($correctPairs);

                    if ($pairCount > 0) {
                        $correctCount = 0;
                        foreach ($correctPairs as $pair) {
                            $userMatchVal = $userMatches[$pair->left_item] ?? null;
                            if ($userMatchVal !== null && trim($userMatchVal) === trim($pair->right_item)) {
                                $correctCount++;
                            }
                        }
                        $scoreEarned = ($correctCount / $pairCount) * $weight;
                    }
                    $ans->update(['score' => round($scoreEarned, 2)]);
                    $totalEarned += $scoreEarned;
                    break;

                case 'essay':
                    $hasEssay = true;
                    // If essay has already been manually graded, preserve score
                    if ($ans->score !== null) {
                        $totalEarned += (float) $ans->score;
                    }
                    break;

                default:
                    $ans->update(['score' => 0]);
                    break;
            }
        }

        // Calculate score percentage (0 - 100)
        $scorePercent = $totalWeight > 0 ? round(($totalEarned / $totalWeight) * 100, 2) : 0;

        $updateData = [];
        if (!$hasEssay) {
            $updateData['total_score'] = $scorePercent;
            $updateData['is_passed'] = $scorePercent >= ($exam->kkm_score ?? 75);
        }

        if (!empty($updateData)) {
            $attempt->update($updateData);
        }

        return [
            'total_score' => $hasEssay ? null : $scorePercent,
            'is_passed' => $hasEssay ? null : ($scorePercent >= ($exam->kkm_score ?? 75)),
            'has_essay' => $hasEssay,
            'total_weight' => $totalWeight,
            'total_earned' => round($totalEarned, 2),
        ];
    }
}
