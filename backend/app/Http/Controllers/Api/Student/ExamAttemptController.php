<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamGroup;
use App\Models\StudentExamAttempt;
use App\Models\StudentAnswer;
use App\Jobs\GradeStudentExamAttemptJob;
use App\Services\AutoGradingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamAttemptController extends Controller
{
    protected AutoGradingService $gradingService;

    public function __construct(AutoGradingService $gradingService)
    {
        $this->gradingService = $gradingService;
    }

    // Retrieve list of available exams for the logged in student
    public function availableExams(Request $request)
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        // Get exams that have groups mapped to this student
        $groups = ExamGroup::whereHas('students', function ($q) use ($student) {
            $q->where('student_id', $student->id);
        })->with(['exam.subject'])->latest()->get();

        $exams = $groups->map(function ($g) use ($student) {
            $attempt = StudentExamAttempt::where('student_id', $student->id)
                ->where('exam_group_id', $g->id)
                ->first();

            $startTime = $g->start_time ?: $g->exam->start_time;
            $endTime = $g->end_time ?: $g->exam->end_time;

            return [
                'exam_group_id' => $g->id,
                'exam_id' => $g->exam_id,
                'title' => $g->exam->title,
                'group_name' => $g->name,
                'subject_code' => $g->exam->subject->code ?? '-',
                'subject_name' => $g->exam->subject->name ?? '-',
                'duration_minutes' => $g->exam->duration_minutes,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => $g->exam->status,
                'attempt' => $attempt ? [
                    'id' => $attempt->id,
                    'status' => $attempt->status,
                    'started_at' => $attempt->started_at,
                    'submitted_at' => $attempt->submitted_at,
                    'total_score' => $attempt->status === 'disqualified' ? 0 : $attempt->total_score,
                ] : null
            ];
        });

        return response()->json($exams);
    }

    public function start(Request $request)
    {
        $request->validate([
            'exam_group_id' => 'required|exists:exam_groups,id',
            'token' => 'nullable|string',
        ]);

        $student = $request->user()->student;
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 422);
        }

        $group = ExamGroup::with('exam.questions')->findOrFail($request->exam_group_id);
        $exam = $group->exam;

        // Auto-enroll student into group if not already present so they never get locked out
        if (!$group->students()->where('student_id', $student->id)->exists()) {
            $group->students()->attach($student->id);
        }

        // Check window time (prioritize group time, fallback to exam time)
        $now = now();
        
        $startTime = $group->start_time ?: $exam->start_time;
        $endTime = $group->end_time ?: $exam->end_time;

        if (($startTime && $now->lt($startTime)) || ($endTime && $now->gt($endTime))) {
            return response()->json([
                'message' => 'Jadwal ujian saat ini sedang ditutup. Waktu buka: ' . ($startTime ? $startTime->format('d M Y H:i') : '-') . ' s/d ' . ($endTime ? $endTime->format('d M Y H:i') : '-')
            ], 400);
        }

        // Look for existing attempt for this specific group/session
        $attempt = StudentExamAttempt::where('student_id', $student->id)
            ->where('exam_id', $exam->id)
            ->where('exam_group_id', $group->id)
            ->first();

        if ($attempt) {
            if ($attempt->status === 'disqualified') {
                return response()->json([
                    'message' => 'Anda telah didiskualifikasi dari sesi ujian ini karena melanggar aturan pengawasan anti-cheat dan tidak dapat mengakses kembali.',
                    'attempt' => $attempt
                ], 403);
            }

            if ($attempt->status === 'submitted' || $attempt->status === 'auto_submitted') {
                return response()->json([
                    'message' => 'Anda telah menyelesaikan sesi ujian ini dan tidak dapat mengerjakan ulang.',
                    'attempt' => $attempt
                ], 400);
            }

            // Resume attempt: calculate remaining time
            $durationSeconds = $exam->duration_minutes * 60;
            $endTime = $attempt->started_at->copy()->addSeconds($durationSeconds);

            if ($now->greaterThanOrEqualTo($endTime)) {
                // Auto submit it
                $attempt->update([
                    'status' => 'auto_submitted',
                    'submitted_at' => $endTime,
                    'time_remaining_seconds' => 0
                ]);
                $this->gradingService->gradeAttempt($attempt);
                GradeStudentExamAttemptJob::dispatch($attempt->id);

                return response()->json([
                    'message' => 'Waktu ujian telah habis.',
                    'attempt' => $attempt
                ], 400);
            }

            $remaining = (int) $now->diffInSeconds($endTime);
            $attempt->update(['time_remaining_seconds' => $remaining]);
            return response()->json([
                'message' => 'Melanjutkan ujian.',
                'attempt' => $attempt,
                'questions' => $this->getAttemptQuestions($attempt)
            ]);
        }

        // Create new attempt with High-Performance Bulk Insertion for seeded answers
        $attempt = DB::transaction(function () use ($student, $exam, $group) {
            $att = StudentExamAttempt::create([
                'student_id' => $student->id,
                'exam_id' => $exam->id,
                'exam_group_id' => $group->id,
                'status' => 'in_progress',
                'started_at' => now(),
                'time_remaining_seconds' => $exam->duration_minutes * 60
            ]);

            // Seed blank answers in batch
            $questions = $exam->questions;
            if ($exam->settings['shuffle_questions'] ?? false) {
                $questions = $questions->shuffle();
            }

            $timestamp = now();
            $bulkData = [];
            foreach ($questions as $q) {
                $bulkData[] = [
                    'attempt_id' => $att->id,
                    'question_bank_id' => $q->id,
                    'answer_content' => null,
                    'is_flagged' => false,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            if (!empty($bulkData)) {
                StudentAnswer::insert($bulkData);
            }

            return $att;
        });

        return response()->json([
            'message' => 'Ujian dimulai.',
            'attempt' => $attempt,
            'questions' => $this->getAttemptQuestions($attempt)
        ], 201);
    }

    public function showAttempt(Request $request, $id)
    {
        $student = $request->user()->student;
        $attempt = StudentExamAttempt::with(['exam.subject', 'examGroup'])
            ->where('student_id', $student->id)
            ->findOrFail($id);

        // Refresh remaining time
        if ($attempt->status === 'in_progress') {
            $now = now();
            $durationSeconds = $attempt->exam->duration_minutes * 60;
            $endTime = $attempt->started_at->copy()->addSeconds($durationSeconds);

            if ($now->greaterThanOrEqualTo($endTime)) {
                $attempt->update([
                    'status' => 'auto_submitted',
                    'submitted_at' => $endTime,
                    'time_remaining_seconds' => 0
                ]);
                $this->gradingService->gradeAttempt($attempt);
                GradeStudentExamAttemptJob::dispatch($attempt->id);
                $attempt->refresh();
            } else {
                $remaining = (int) $now->diffInSeconds($endTime);
                $attempt->update(['time_remaining_seconds' => $remaining]);
            }
        }

        return response()->json([
            'attempt' => $attempt,
            'time_remaining_seconds' => $attempt->time_remaining_seconds,
            'questions' => $this->getAttemptQuestions($attempt)
        ]);
    }

    public function submit(Request $request, $id)
    {
        $student = $request->user()->student;
        $attempt = StudentExamAttempt::where('student_id', $student->id)->findOrFail($id);

        if ($attempt->status !== 'in_progress') {
            return response()->json([
                'message' => 'Ujian ini telah selesai dikumpulkan sebelumnya.',
                'attempt' => $attempt
            ]);
        }

        DB::transaction(function () use ($attempt) {
            $attempt->update([
                'status' => 'submitted',
                'submitted_at' => now(),
                'time_remaining_seconds' => 0
            ]);

            // Fast-Accept: Perform scoring via service and dispatch queue job
            $this->gradingService->gradeAttempt($attempt);
            GradeStudentExamAttemptJob::dispatch($attempt->id);
        });

        $attempt->refresh();

        return response()->json([
            'message' => 'Ujian berhasil diserahkan.',
            'attempt' => $attempt
        ]);
    }

    private function getAttemptQuestions($attempt)
    {
        // If attempt has no answers or orphaned questions, auto-seed from exam questions using bulk insert
        $validAnswersCount = StudentAnswer::where('attempt_id', $attempt->id)->whereHas('questionBank')->count();
        if ($validAnswersCount === 0 && $attempt->exam && $attempt->exam->questions()->count() > 0) {
            StudentAnswer::where('attempt_id', $attempt->id)->delete();
            $questions = $attempt->exam->questions;
            if ($attempt->exam->settings['shuffle_questions'] ?? false) {
                $questions = $questions->shuffle();
            }
            
            $timestamp = now();
            $bulkData = [];
            foreach ($questions as $q) {
                $bulkData[] = [
                    'attempt_id' => $attempt->id,
                    'question_bank_id' => $q->id,
                    'answer_content' => null,
                    'is_flagged' => false,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }
            if (!empty($bulkData)) {
                StudentAnswer::insert($bulkData);
            }
        }

        // Return seeded answers with question details
        return StudentAnswer::where('attempt_id', $attempt->id)
            ->with(['questionBank.options' => function($q) use ($attempt) {
                // Shuffle options if setting enabled
                if ($attempt->exam->settings['shuffle_options'] ?? false) {
                    $q->inRandomOrder();
                } else {
                    $q->orderBy('order');
                }
            }, 'questionBank.matchingPairs'])
            ->get()
            ->filter(fn($ans) => $ans->questionBank !== null)
            ->map(function ($ans) {
                $q = $ans->questionBank;
                // Strip the correct flag from options to prevent client inspection!
                $options = $q->options ? $q->options->map(function ($opt) {
                    return [
                        'id' => $opt->id,
                        'content' => $opt->content,
                        'media_url' => $opt->media_url
                    ];
                }) : collect([]);

                return [
                    'answer_id' => $ans->id,
                    'question_id' => $ans->question_bank_id,
                    'topic' => $q->topic ?? '-',
                    'type' => $q->type,
                    'content' => $q->content,
                    'media_url' => $q->media_url,
                    'options' => $options,
                    'matching_pairs' => $q->matchingPairs ?? [],
                    
                    // Saved answer progress
                    'answer_content' => $ans->answer_content,
                    'is_flagged' => (bool) $ans->is_flagged,
                ];
            })
            ->values();
    }
}

