<?php

namespace App\Jobs;

use App\Models\StudentExamAttempt;
use App\Services\AutoGradingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GradeStudentExamAttemptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $attemptId;
    public int $tries = 3;
    public int $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(int $attemptId)
    {
        $this->attemptId = $attemptId;
    }

    /**
     * Execute the job.
     */
    public function handle(AutoGradingService $gradingService): void
    {
        $attempt = StudentExamAttempt::find($this->attemptId);

        if (!$attempt) {
            Log::warning("GradeStudentExamAttemptJob: Attempt ID {$this->attemptId} not found.");
            return;
        }

        $result = $gradingService->gradeAttempt($attempt);
        Log::info("GradeStudentExamAttemptJob: Successfully graded attempt {$this->attemptId}", $result);
    }
}
