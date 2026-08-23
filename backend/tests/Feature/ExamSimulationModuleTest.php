<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Subject;
use App\Models\AcademicYear;
use App\Models\QuestionPackage;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\QuestionMatchingPair;
use App\Models\Exam;
use App\Models\ExamGroup;
use App\Models\StudentExamAttempt;
use App\Models\StudentAnswer;
use App\Jobs\GradeStudentExamAttemptJob;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ExamSimulationModuleTest extends TestCase
{
    protected $academicYear;
    protected $subject;
    protected $teacher;
    protected $teacherUser;
    protected $studentUser;
    protected $student;
    protected $package;
    protected $exam;
    protected $examGroup;

    protected function setUp(): void
    {
        parent::setUp();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'guru', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'siswa', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        // 1. Setup Academic Year
        $this->academicYear = AcademicYear::firstOrCreate(
            ['name' => '2026/2027 Ganjil'],
            [
                'name' => '2026/2027 Ganjil',
                'semester' => 'odd',
                'is_active' => true
            ]
        );
        $this->academicYear->update(['is_active' => true]);

        // 2. Setup Subject
        $this->subject = Subject::firstOrCreate(
            ['code' => 'SIM-CBT'],
            ['name' => 'Simulasi CBT Komprehensif']
        );

        // 3. Setup Teacher
        $this->teacherUser = User::firstOrCreate(
            ['email' => 'teacher.simulasi@cbt.com'],
            [
                'name' => 'Guru Penguji Simulasi',
                'username' => 'GURU_SIM',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        if (!$this->teacherUser->hasRole('guru')) {
            $this->teacherUser->assignRole('guru');
        }

        $this->teacher = Teacher::firstOrCreate(
            ['user_id' => $this->teacherUser->id],
            ['nip' => '199201012026011001']
        );

        // 4. Setup Student
        $this->studentUser = User::firstOrCreate(
            ['email' => 'siswa.simulasi@cbt.com'],
            [
                'name' => 'Siswa Peserta Simulasi',
                'username' => 'SISWA_SIM',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        if (!$this->studentUser->hasRole('siswa')) {
            $this->studentUser->assignRole('siswa');
        }

        $this->student = Student::firstOrCreate(
            ['user_id' => $this->studentUser->id],
            [
                'nisn' => '0098765432',
                'nis' => '26001',
                'gender' => 'L'
            ]
        );

        // Clean previous attempts for this student to ensure isolated test runs
        $oldAttemptIds = StudentExamAttempt::where('student_id', $this->student->id)->pluck('id');
        StudentAnswer::whereIn('attempt_id', $oldAttemptIds)->delete();
        StudentExamAttempt::whereIn('id', $oldAttemptIds)->delete();

        // 5. Setup Question Package with multiple question types
        $this->package = QuestionPackage::firstOrCreate(
            ['code' => 'PKT-SIM-TEST-01'],
            [
                'teacher_id' => $this->teacher->id,
                'subject_id' => $this->subject->id,
                'title' => 'Berkas Paket Simulasi Ujian Mandiri',
                'description' => 'Paket berisi 4 tipe soal untuk pengujian modul ujian.',
                'total_questions' => 4
            ]
        );

        // Clean previous questions & options if any
        $oldQIds = QuestionBank::where('package_id', $this->package->id)->pluck('id');
        QuestionOption::whereIn('question_bank_id', $oldQIds)->delete();
        QuestionMatchingPair::whereIn('question_bank_id', $oldQIds)->delete();
        QuestionBank::whereIn('id', $oldQIds)->delete();

        // Question 1: Multiple Choice Single (MCQ) - 25 points
        $q1 = QuestionBank::create([
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Aljabar',
            'type' => 'multiple_choice_single',
            'content' => 'Berapakah nilai dari $$\\sqrt{144} + 2^3$$?',
            'difficulty' => 'easy',
        ]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '18', 'is_correct' => false, 'order' => 0]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '20', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '22', 'is_correct' => false, 'order' => 2]);

        // Question 2: Multiple Choice Multi (Complex MCQ) - 25 points
        $q2 = QuestionBank::create([
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Himpunan',
            'type' => 'multiple_choice_multi',
            'content' => 'Pilihlah semua bilangan prima yang kurang dari 10!',
            'difficulty' => 'medium',
        ]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '2', 'is_correct' => true, 'order' => 0]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '3', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '4', 'is_correct' => false, 'order' => 2]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '7', 'is_correct' => true, 'order' => 3]);

        // Question 3: True / False - 25 points
        $q3 = QuestionBank::create([
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Geometri',
            'type' => 'true_false',
            'content' => 'Jumlah sudut dalam sebuah segitiga datar adalah $$180^\\circ$$.',
            'difficulty' => 'easy',
        ]);
        QuestionOption::create(['question_bank_id' => $q3->id, 'content' => 'Benar', 'is_correct' => true, 'order' => 0]);
        QuestionOption::create(['question_bank_id' => $q3->id, 'content' => 'Salah', 'is_correct' => false, 'order' => 1]);

        // Question 4: Essay - 25 points
        $q4 = QuestionBank::create([
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Kalkulus',
            'type' => 'essay',
            'content' => 'Jelaskan konsep dasar limit fungsi ketika $$x \\to c$$!',
            'difficulty' => 'hard',
        ]);

        $this->package->syncTotalQuestions();

        // 6. Setup Exam linked to Package
        $this->exam = Exam::create([
            'title' => 'Simulasi Ujian Akhir CBT Online 2026',
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'duration_minutes' => 60,
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(3),
            'settings' => [
                'allow_backtrack' => true,
                'allow_flag' => true,
                'shuffle_questions' => true,
                'shuffle_options' => true,
                'show_result_immediately' => true,
                'max_tab_switches' => 3
            ],
            'kkm_score' => 75,
            'status' => 'published'
        ]);

        // Attach questions to exam with weight 25 each (Total 100)
        $questions = QuestionBank::where('package_id', $this->package->id)->get();
        $syncData = [];
        foreach ($questions as $idx => $q) {
            $syncData[$q->id] = ['weight' => 25, 'order' => $idx];
        }
        $this->exam->questions()->sync($syncData);

        // 7. Setup Sessional Group / Wave with Token
        $this->examGroup = ExamGroup::create([
            'exam_id' => $this->exam->id,
            'name' => 'Gelombang 1 Pagi',
            'token' => 'SIMULASI1',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(3),
        ]);

        $this->examGroup->students()->sync([$this->student->id]);
    }

    protected function resetAuth(): void
    {
        auth()->forgetGuards();
        \Illuminate\Support\Facades\Auth::forgetGuards();
        app('auth')->forgetGuards();
    }

    protected function getStudentAuth(): array
    {
        $this->resetAuth();
        $response = $this->postJson('/api/auth/login', [
            'login' => 'siswa.simulasi@cbt.com',
            'password' => 'password'
        ]);

        return [
            'Authorization' => 'Bearer ' . $response->json('token'),
            'X-Session-Token' => $response->json('session_token')
        ];
    }

    protected function getTeacherAuth(): array
    {
        $this->resetAuth();
        $response = $this->postJson('/api/auth/login', [
            'login' => 'teacher.simulasi@cbt.com',
            'password' => 'password'
        ]);

        return [
            'Authorization' => 'Bearer ' . $response->json('token'),
            'X-Session-Token' => $response->json('session_token')
        ];
    }

    /**
     * TEST SUITE 1: Verifikasi Daftar Ujian & Akses Langsung Ujian (Direct Access Tanpa Token)
     */
    public function test_01_available_exams_and_token_validation()
    {
        $headers = $this->getStudentAuth();

        // 1. Check available exams list for student
        $resList = $this->withHeaders($headers)->getJson('/api/student/exams');
        $resList->assertStatus(200);
        $this->assertTrue(collect($resList->json())->contains('exam_id', $this->exam->id));

        // 2. Start attempt directly without token -> Must succeed with 201
        $resDirect = $this->withHeaders($headers)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
        ]);
        $resDirect->assertStatus(201)
                  ->assertJsonStructure([
                      'message',
                      'attempt' => ['id', 'status', 'time_remaining_seconds'],
                      'questions'
                  ]);

        $this->assertEquals('in_progress', $resDirect->json('attempt.status'));
        $this->assertCount(4, $resDirect->json('questions'));
    }

    /**
     * TEST SUITE 2: Anti-Duplication Guard & Resume Attempt Resilience
     */
    public function test_02_attempt_resilience_and_resume()
    {
        $headers = $this->getStudentAuth();

        // Start first attempt
        $resStart = $this->withHeaders($headers)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
            'token' => 'SIMULASI1'
        ]);
        $resStart->assertStatus(201);
        $attemptId = $resStart->json('attempt.id');

        // Try to start second attempt with same token -> Must return existing attempt (No duplicate attempt created)
        $resSecond = $this->withHeaders($headers)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
            'token' => 'SIMULASI1'
        ]);
        $this->assertTrue(in_array($resSecond->status(), [200, 201]));
        $this->assertEquals($attemptId, $resSecond->json('attempt.id'));

        // Resume attempt (Simulate page refresh)
        $resResume = $this->withHeaders($headers)->getJson("/api/student/attempts/{$attemptId}");
        $resResume->assertStatus(200)
                  ->assertJson(['attempt' => ['id' => $attemptId, 'status' => 'in_progress']]);
    }

    /**
     * TEST SUITE 3: Real-Time Autosave, Ragu-Ragu (Flag), & Network Drop Protection
     */
    public function test_03_autosave_all_question_types_and_flagging()
    {
        $headers = $this->getStudentAuth();

        $resStart = $this->withHeaders($headers)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
            'token' => 'SIMULASI1'
        ]);
        $attemptId = $resStart->json('attempt.id');
        $questions = $resStart->json('questions');

        // Find MCQ Single Question
        $mcqSingle = collect($questions)->firstWhere('type', 'multiple_choice_single');
        $correctOption = collect($mcqSingle['options'])->firstWhere('content', '20');

        // 1. Autosave MCQ Single
        $resSave1 = $this->withHeaders($headers)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $mcqSingle['question_id'],
            'answer_content' => ['option_id' => $correctOption['id']],
            'is_flagged' => false
        ]);
        $resSave1->assertStatus(200);

        // Find Essay Question
        $essay = collect($questions)->firstWhere('type', 'essay');

        // 2. Autosave Essay with Flag (Ragu-ragu = True)
        $resSave2 = $this->withHeaders($headers)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $essay['question_id'],
            'answer_content' => ['essay_text' => 'Limit fungsi menyatakan nilai pendekatan f(x) ketika x mendekati nilai tertentu.'],
            'is_flagged' => true
        ]);
        $resSave2->assertStatus(200);

        // 3. Verify state persistence after simulated disconnect
        $resCheck = $this->withHeaders($headers)->getJson("/api/student/attempts/{$attemptId}");
        $resCheck->assertStatus(200);

        $savedMcq = collect($resCheck->json('questions'))->firstWhere('question_id', $mcqSingle['question_id']);
        $this->assertEquals($correctOption['id'], $savedMcq['answer_content']['option_id']);
        $this->assertFalse($savedMcq['is_flagged']);

        $savedEssay = collect($resCheck->json('questions'))->firstWhere('question_id', $essay['question_id']);
        $this->assertEquals('Limit fungsi menyatakan nilai pendekatan f(x) ketika x mendekati nilai tertentu.', $savedEssay['answer_content']['essay_text']);
        $this->assertTrue($savedEssay['is_flagged']);
    }

    /**
     * TEST SUITE 4: Anti-Cheat Proctoring & Violation Logging
     */
    public function test_04_anti_cheat_proctoring_and_disqualification()
    {
        $headers = $this->getStudentAuth();

        $resStart = $this->withHeaders($headers)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
            'token' => 'SIMULASI1'
        ]);
        $attemptId = $resStart->json('attempt.id');

        // Log 1st tab switch
        $v1 = $this->withHeaders($headers)->postJson('/api/student/attempts/violations', [
            'attempt_id' => $attemptId,
            'type' => 'tab_switch',
            'metadata' => ['event' => 'window_blur', 'count' => 1]
        ]);
        $v1->assertStatus(200)->assertJson(['violations_count' => 1, 'disqualified' => false]);

        // Log 2nd tab switch
        $v2 = $this->withHeaders($headers)->postJson('/api/student/attempts/violations', [
            'attempt_id' => $attemptId,
            'type' => 'tab_switch',
            'metadata' => ['event' => 'window_blur', 'count' => 2]
        ]);
        $v2->assertStatus(200)->assertJson(['violations_count' => 2, 'disqualified' => false]);

        // Log 3rd tab switch (Threshold = 3) -> Should trigger disqualification warning / lock
        $v3 = $this->withHeaders($headers)->postJson('/api/student/attempts/violations', [
            'attempt_id' => $attemptId,
            'type' => 'tab_switch',
            'metadata' => ['event' => 'window_blur', 'count' => 3]
        ]);
        $v3->assertStatus(200)->assertJson(['disqualified' => true]);

        // Verify attempt is marked disqualified in database
        $attempt = StudentExamAttempt::find($attemptId);
        $this->assertEquals('disqualified', $attempt->status);
    }

    /**
     * TEST SUITE 5: Fast-Accept Submit, Async Auto-Grading & Teacher Manual Essay Score
     */
    public function test_05_fast_accept_submit_and_complete_scoring_flow()
    {
        $studentHeaders = $this->getStudentAuth();

        $resStart = $this->withHeaders($studentHeaders)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
            'token' => 'SIMULASI1'
        ]);
        $attemptId = $resStart->json('attempt.id');
        $questions = $resStart->json('questions');

        // 1. Answer Question 1 (MCQ Single - 25 points): Answer CORRECT (20)
        $q1 = collect($questions)->firstWhere('type', 'multiple_choice_single');
        $opt1Correct = collect($q1['options'])->firstWhere('content', '20');
        $this->withHeaders($studentHeaders)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $q1['question_id'],
            'answer_content' => ['option_id' => $opt1Correct['id']],
            'is_flagged' => false
        ]);

        // 2. Answer Question 2 (MCQ Multi - 25 points): Answer CORRECT (2, 3, 7)
        $q2 = collect($questions)->firstWhere('type', 'multiple_choice_multi');
        $optsCorrect = collect($q2['options'])->whereIn('content', ['2', '3', '7'])->pluck('id')->toArray();
        $this->withHeaders($studentHeaders)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $q2['question_id'],
            'answer_content' => ['option_ids' => $optsCorrect],
            'is_flagged' => false
        ]);

        // 3. Answer Question 3 (True/False - 25 points): Answer CORRECT (Benar)
        $q3 = collect($questions)->firstWhere('type', 'true_false');
        $this->withHeaders($studentHeaders)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $q3['question_id'],
            'answer_content' => ['text' => 'Benar'],
            'is_flagged' => false
        ]);

        // 4. Answer Question 4 (Essay - 25 points)
        $q4 = collect($questions)->firstWhere('type', 'essay');
        $this->withHeaders($studentHeaders)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $q4['question_id'],
            'answer_content' => ['essay_text' => 'Limit fungsi adalah nilai yang dihampiri oleh suatu fungsi.'],
            'is_flagged' => false
        ]);

        // 5. Submit Exam Attempt (Fast-Accept Response)
        $resSubmit = $this->withHeaders($studentHeaders)->postJson("/api/student/attempts/{$attemptId}/submit");
        $resSubmit->assertStatus(200)
                  ->assertJson(['attempt' => ['status' => 'submitted']]);

        // Double submit protection (Idempotent 200 OK response)
        $resDoubleSubmit = $this->withHeaders($studentHeaders)->postJson("/api/student/attempts/{$attemptId}/submit");
        $resDoubleSubmit->assertStatus(200)
                        ->assertJson(['message' => 'Ujian ini telah selesai dikumpulkan sebelumnya.']);

        // Execute background queue job synchronously for auto-grading non-essay questions
        GradeStudentExamAttemptJob::dispatchSync($attemptId);

        // Check that auto-graded answers have their respective scores
        $answers = StudentAnswer::where('attempt_id', $attemptId)->get();
        $autoGradedEarned = $answers->whereNotNull('score')->sum('score');
        $this->assertEquals(75, $autoGradedEarned);

        // 6. Teacher Login and Manual Essay Grading
        $teacherHeaders = $this->getTeacherAuth();

        // Get attempt answers for grading
        $resAttemptDetail = $this->withHeaders($teacherHeaders)->getJson("/api/teacher/attempts/{$attemptId}");
        $resAttemptDetail->assertStatus(200);

        $essayAnswer = collect($resAttemptDetail->json('answers'))->firstWhere('question_bank.type', 'essay');

        // Teacher grades essay with 25 points (Full score)
        $resGradeEssay = $this->withHeaders($teacherHeaders)->postJson("/api/teacher/answers/{$essayAnswer['id']}/grade", [
            'score' => 25,
            'feedback' => 'Penjelasan konsep limit sudah sangat tepat dan komprehensif.'
        ]);
        $resGradeEssay->assertStatus(200);

        // Final score should now be 75 + 25 = 100 points
        $finalAttempt = StudentExamAttempt::find($attemptId);
        $this->assertEquals(100, $finalAttempt->total_score);
        $this->assertTrue((bool)$finalAttempt->is_passed);

        // 7. Student checks final result
        $studentHeaders = $this->getStudentAuth();
        $resResult = $this->withHeaders($studentHeaders)->getJson("/api/student/results/{$attemptId}");
        $resResult->assertStatus(200)
                  ->assertJson([
                      'attempt' => [
                          'total_score' => 100,
                          'is_passed' => true
                      ]
                  ]);
    }

    /**
     * TEST SUITE 6: Perhitungan Waktu Server (Server-Side Timer Calculation)
     */
    public function test_06_server_timer_calculation_and_expiry()
    {
        $studentHeaders = $this->getStudentAuth();

        $resStart = $this->withHeaders($studentHeaders)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $this->examGroup->id,
            'token' => 'SIMULASI1'
        ]);
        $attemptId = $resStart->json('attempt.id');
        $initialTime = $resStart->json('attempt.time_remaining_seconds');

        // Initial remaining time should be 60 minutes = 3600 seconds (or slightly less due to processing ms)
        $this->assertGreaterThanOrEqual(3590, $initialTime);
        $this->assertLessThanOrEqual(3600, $initialTime);

        // Simulate 15 minutes elapsed on server side
        $attempt = StudentExamAttempt::find($attemptId);
        $attempt->update([
            'started_at' => now()->subMinutes(15)
        ]);

        $resResume = $this->withHeaders($studentHeaders)->getJson("/api/student/attempts/{$attemptId}");
        $resResume->assertStatus(200);
        $updatedTime = $resResume->json('attempt.time_remaining_seconds');

        // Time remaining should now be approximately 45 minutes = 2700 seconds (allow 10 sec leeway)
        $this->assertGreaterThanOrEqual(2690, $updatedTime);
        $this->assertLessThanOrEqual(2710, $updatedTime);
    }

    /**
     * TEST SUITE 7: Presisi Penilaian Tipe Soal Menjodohkan (Matching Question)
     */
    public function test_07_matching_question_type_scoring_precision()
    {
        // Setup matching question in package
        $qMatching = QuestionBank::create([
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Ibukota',
            'type' => 'matching',
            'content' => 'Pasangkan negara dengan ibukotanya masing-masing!',
            'difficulty' => 'easy',
        ]);
        QuestionMatchingPair::create(['question_bank_id' => $qMatching->id, 'left_item' => 'Indonesia', 'right_item' => 'Jakarta']);
        QuestionMatchingPair::create(['question_bank_id' => $qMatching->id, 'left_item' => 'Jepang', 'right_item' => 'Tokyo']);
        QuestionMatchingPair::create(['question_bank_id' => $qMatching->id, 'left_item' => 'Perancis', 'right_item' => 'Paris']);
        QuestionMatchingPair::create(['question_bank_id' => $qMatching->id, 'left_item' => 'Inggris', 'right_item' => 'London']);

        // Create exam with only this matching question (Weight = 100 points)
        $examMatching = Exam::create([
            'title' => 'Simulasi Ujian Menjodohkan',
            'package_id' => $this->package->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'duration_minutes' => 30,
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(3),
            'settings' => [
                'allow_backtrack' => true,
                'allow_flag' => true,
                'shuffle_questions' => false,
                'shuffle_options' => false,
                'show_result_immediately' => true,
            ],
            'kkm_score' => 70,
            'status' => 'published'
        ]);
        $examMatching->questions()->sync([$qMatching->id => ['weight' => 100, 'order' => 0]]);

        $groupMatching = ExamGroup::create([
            'exam_id' => $examMatching->id,
            'name' => 'Sesi Menjodohkan',
            'token' => 'MATCH1',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(3),
        ]);
        $groupMatching->students()->sync([$this->student->id]);

        $studentHeaders = $this->getStudentAuth();
        $resStart = $this->withHeaders($studentHeaders)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $groupMatching->id,
            'token' => 'MATCH1'
        ]);
        $attemptId = $resStart->json('attempt.id');

        // Student answers 3 out of 4 correctly (75% precision score = 75 points)
        $this->withHeaders($studentHeaders)->patchJson("/api/student/attempts/{$attemptId}/answers", [
            'question_id' => $qMatching->id,
            'answer_content' => [
                'matches' => [
                    'Indonesia' => 'Jakarta', // Correct
                    'Jepang' => 'Tokyo',     // Correct
                    'Perancis' => 'Paris',   // Correct
                    'Inggris' => 'Berlin'    // Incorrect (should be London)
                ]
            ],
            'is_flagged' => false
        ]);

        // Submit and grade
        $this->withHeaders($studentHeaders)->postJson("/api/student/attempts/{$attemptId}/submit");
        GradeStudentExamAttemptJob::dispatchSync($attemptId);

        $attempt = StudentExamAttempt::find($attemptId);
        $this->assertEquals(75, $attempt->total_score);
        $this->assertTrue((bool)$attempt->is_passed);
    }
}
