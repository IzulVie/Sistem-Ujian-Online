<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Major;
use App\Models\ClassRoom;
use App\Models\Subject;
use App\Models\AcademicYear;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\QuestionMatchingPair;
use App\Models\Exam;
use App\Models\ExamGroup;
use App\Models\StudentExamAttempt;
use App\Models\StudentAnswer;
use App\Models\ViolationLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class CbtFunctionalTest extends TestCase
{
    protected $studentUser;
    protected $student;
    protected $teacherUser;
    protected $teacher;
    protected $adminUser;
    protected $subject;
    protected $academicYear;

    protected function resetAuth()
    {
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetAuth();

        // 1. Fetch or create roles and entities
        $this->academicYear = AcademicYear::firstOrCreate(['name' => '2025/2026 Ganjil'], [
            'name' => '2025/2026 Ganjil',
            'semester' => 'odd',
            'is_active' => true
        ]);
        $this->academicYear->update(['is_active' => true]);

        $this->subject = Subject::firstOrCreate(['code' => 'TEST-01'], [
            'name' => 'Matematika Terapan',
            'code' => 'TEST-01'
        ]);

        $major = Major::firstOrCreate(['code' => 'RPL'], ['name' => 'RPL', 'code' => 'RPL']);
        $class = ClassRoom::firstOrCreate(['name' => 'XII RPL 1'], ['name' => 'XII RPL 1', 'level' => 12, 'major_id' => $major->id]);

        // Student
        $this->studentUser = User::firstOrCreate(['email' => 'test.student@cbt.com'], [
            'name' => 'Test Student',
            'username' => '9999999999',
            'email' => 'test.student@cbt.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        if (!$this->studentUser->hasRole('siswa')) {
            $this->studentUser->assignRole('siswa');
        }
        $this->student = Student::firstOrCreate(['user_id' => $this->studentUser->id], [
            'user_id' => $this->studentUser->id,
            'nisn' => '9999999999',
            'nis' => '99999',
            'class_id' => $class->id,
            'major_id' => $major->id,
        ]);

        // Teacher
        $this->teacherUser = User::firstOrCreate(['email' => 'test.teacher@cbt.com'], [
            'name' => 'Test Teacher',
            'email' => 'test.teacher@cbt.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        if (!$this->teacherUser->hasRole('guru')) {
            $this->teacherUser->assignRole('guru');
        }
        $this->teacher = Teacher::firstOrCreate(['user_id' => $this->teacherUser->id], [
            'user_id' => $this->teacherUser->id,
            'nip' => '999988887777',
        ]);
        $this->teacher->subjects()->syncWithoutDetaching([$this->subject->id]);

        // Admin
        $this->adminUser = User::firstOrCreate(['email' => 'test.admin@cbt.com'], [
            'name' => 'Test Admin',
            'email' => 'test.admin@cbt.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        if (!$this->adminUser->hasRole('super_admin')) {
            $this->adminUser->assignRole('super_admin');
        }
    }

    /**
     * 3.1 Autentikasi & Session
     */
    public function test_3_1_1_login_with_valid_and_invalid_credentials()
    {
        $this->resetAuth();

        // 1. Invalid password
        $response = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'wrongpassword'
        ]);
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['login']);

        $this->resetAuth();

        // 2. Valid password for student (via email)
        $response = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'session_token', 'user' => ['id', 'name', 'role']]);

        $this->resetAuth();

        // 3. Valid login for student (via NISN)
        $response = $this->postJson('/api/auth/login', [
            'login' => '9999999999',
            'password' => 'password'
        ]);
        $response->assertStatus(200)
                 ->assertJson(['user' => ['role' => 'siswa']]);
    }

    public function test_3_1_2_single_session_lock_and_overwrite()
    {
        $this->resetAuth();

        // Login from Device 1
        $login1 = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $token1 = $login1->json('token');
        $sessionToken1 = $login1->json('session_token');

        $this->resetAuth();

        // Verify Device 1 can access protected route
        $res1 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token1,
            'X-Session-Token' => $sessionToken1
        ])->getJson('/api/auth/me');
        $res1->assertStatus(200);

        $this->resetAuth();

        // Login from Device 2 with same account
        $login2 = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $token2 = $login2->json('token');
        $sessionToken2 = $login2->json('session_token');

        $this->assertNotEquals($sessionToken1, $sessionToken2);

        $this->resetAuth();

        // Verify Device 1 is now rejected (token deleted and/or session overwritten)
        $res1After = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token1,
            'X-Session-Token' => $sessionToken1
        ])->getJson('/api/auth/me');
        $res1After->assertStatus(401);

        $this->resetAuth();

        // Verify Device 2 is authorized
        $res2 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token2,
            'X-Session-Token' => $sessionToken2
        ])->getJson('/api/auth/me');
        $res2->assertStatus(200);
    }

    /**
     * 3.2 Bank Soal & Manajemen Ujian
     */
    public function test_3_2_1_crud_question_bank_all_types()
    {
        $this->resetAuth();

        $login = $this->postJson('/api/auth/login', [
            'login' => 'test.teacher@cbt.com',
            'password' => 'password'
        ]);
        $token = $login->json('token');
        $sessionToken = $login->json('session_token');

        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Token' => $sessionToken
        ];

        // 1. Create MCQ Single
        $resSingle = $this->withHeaders($headers)
            ->postJson('/api/teacher/questions', [
                'subject_id' => $this->subject->id,
                'topic' => 'Kalkulus Dasar',
                'type' => 'multiple_choice_single',
                'content' => 'Berapakah turunan pertama dari $$f(x) = x^3$$?',
                'explanation' => 'Turunan dari x^n adalah n*x^(n-1), maka 3x^2.',
                'difficulty' => 'easy',
                'options' => [
                    ['content' => '$$3x^2$$', 'is_correct' => true],
                    ['content' => '$$2x$$', 'is_correct' => false],
                    ['content' => '$$x^2$$', 'is_correct' => false],
                    ['content' => '$$3x$$', 'is_correct' => false],
                ]
            ]);
        $resSingle->assertStatus(201);
        $singleId = $resSingle->json('data.id');

        // 2. Create Essay
        $resEssay = $this->withHeaders($headers)
            ->postJson('/api/teacher/questions', [
                'subject_id' => $this->subject->id,
                'topic' => 'Teorema Aljabar',
                'type' => 'essay',
                'content' => 'Buktikan bahwa himpunan bilangan bulat terhadap operasi penjumlahan membentuk grup abelian!',
                'explanation' => 'Tunjukkan sifat tertutup, asosiatif, elemen identitas, invers, dan komutatif.',
                'difficulty' => 'hard',
            ]);
        $resEssay->assertStatus(201);
        $essayId = $resEssay->json('data.id');

        // 3. Create Matching
        $resMatching = $this->withHeaders($headers)
            ->postJson('/api/teacher/questions', [
                'subject_id' => $this->subject->id,
                'topic' => 'Trigonometri',
                'type' => 'matching',
                'content' => 'Pasangkan nilai sudut istimewa trigonometri!',
                'difficulty' => 'medium',
                'matching_pairs' => [
                    ['left_item' => 'sin(90)', 'right_item' => '1'],
                    ['left_item' => 'cos(90)', 'right_item' => '0'],
                    ['left_item' => 'tan(45)', 'right_item' => '1'],
                ]
            ]);
        $resMatching->assertStatus(201);

        // 4. Update MCQ Question
        $resUpdate = $this->withHeaders($headers)
            ->putJson('/api/teacher/questions/' . $singleId, [
                'subject_id' => $this->subject->id,
                'topic' => 'Kalkulus Lanjut',
                'type' => 'multiple_choice_single',
                'content' => 'Berapakah turunan pertama dari $$f(x) = 2x^3$$?',
                'explanation' => 'Turunan dari 2x^3 adalah 6x^2.',
                'difficulty' => 'medium',
                'options' => [
                    ['content' => '$$6x^2$$', 'is_correct' => true],
                    ['content' => '$$3x^2$$', 'is_correct' => false],
                ]
            ]);
        $resUpdate->assertStatus(200);

        // 5. Delete Essay Question
        $resDel = $this->withHeaders($headers)
            ->deleteJson('/api/teacher/questions/' . $essayId);
        $resDel->assertStatus(200);
    }

    public function test_3_2_2_bulk_import_questions_valid_and_invalid()
    {
        $this->resetAuth();

        $login = $this->postJson('/api/auth/login', [
            'login' => 'test.teacher@cbt.com',
            'password' => 'password'
        ]);
        $token = $login->json('token');
        $sessionToken = $login->json('session_token');

        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Token' => $sessionToken
        ];

        // 1. Invalid CSV format (missing mandatory header)
        $invalidCsv = "topic,type,wrong_header\nAljabar,essay,Test";
        $fileInvalid = UploadedFile::fake()->createWithContent('invalid.csv', $invalidCsv);

        $resInvalid = $this->withHeaders($headers)
            ->postJson('/api/teacher/questions/import', [
                'file' => $fileInvalid
            ]);
        $resInvalid->assertStatus(422)
                   ->assertJsonStructure(['message']);

        // 2. Valid CSV format matching QuestionImportController requirements
        $validCsv = "content,type,difficulty,topic,subject_code,options,correct_options,explanation,matching_pairs\n" .
                    "Berapakah 2+2?,multiple_choice_single,easy,Aljabar,TEST-01,4|3|2|1,4,Penjumlahan dasar,\n" .
                    "Matahari terbit dari timur?,true_false,easy,Logika,TEST-01,Benar|Salah,Benar,Geografi,\n" .
                    "Jelaskan hukum Newton 1!,essay,medium,Fisika,TEST-01,,,Hukum kelembaman,\n";
        $fileValid = UploadedFile::fake()->createWithContent('valid_questions.csv', $validCsv);

        $resValid = $this->withHeaders($headers)
            ->postJson('/api/teacher/questions/import', [
                'file' => $fileValid
            ]);
        $resValid->assertStatus(200)
                 ->assertJsonStructure(['message']);
    }

    /**
     * 3.3 & 3.4 Pengerjaan Ujian & Burst Protection
     */
    public function test_3_3_and_3_4_full_exam_workflow_timer_autosave_idempotency()
    {
        $this->resetAuth();

        $loginStudent = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $studentToken = $loginStudent->json('token');
        $studentSession = $loginStudent->json('session_token');

        $studentHeaders = [
            'Authorization' => 'Bearer ' . $studentToken,
            'X-Session-Token' => $studentSession
        ];

        // 1. Teacher creates exam with questions
        $q1 = QuestionBank::create([
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Aljabar',
            'type' => 'multiple_choice_single',
            'content' => 'Berapakah $$2 + 3$$?',
            'difficulty' => 'easy',
        ]);
        $opt1A = QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '5', 'is_correct' => true, 'order' => 1]);
        $opt1B = QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '6', 'is_correct' => false, 'order' => 2]);

        $q2 = QuestionBank::create([
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Analisis',
            'type' => 'essay',
            'content' => 'Uraikan konsep turunan!',
            'difficulty' => 'medium',
        ]);

        $exam = Exam::create([
            'title' => 'Ujian Akhir Semester Test Workflow',
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'duration_minutes' => 60,
            'start_time' => now()->subMinutes(10),
            'end_time' => now()->addHours(3),
            'kkm_score' => 75,
            'status' => 'published',
            'settings' => [
                'allow_backtrack' => true,
                'allow_flag' => true,
                'shuffle_questions' => false,
                'shuffle_options' => false,
                'show_result_immediately' => true,
                'max_tab_switches' => 3
            ]
        ]);
        $exam->questions()->sync([
            $q1->id => ['weight' => 50, 'order' => 1],
            $q2->id => ['weight' => 50, 'order' => 2]
        ]);

        $group = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Sesi Utama Workflow',
            'start_time' => now()->subMinutes(10),
            'end_time' => now()->addHours(3),
            'token' => 'VALIDTOKEN',
            'max_participants' => 50
        ]);
        $group->students()->sync([$this->student->id]);

        // Test Start Exam without Token (Direct 1-Click Access) -> Verify time_remaining from server
        $resStart = $this->withHeaders($studentHeaders)
            ->postJson('/api/student/attempts/start', [
                'exam_group_id' => $group->id,
            ]);
        $resStart->assertStatus(201)
                 ->assertJsonStructure(['attempt' => ['id', 'status', 'time_remaining_seconds'], 'questions']);

        $attemptId = $resStart->json('attempt.id');
        $this->assertEquals(3600, $resStart->json('attempt.time_remaining_seconds'));

        // Test Autosave Answer for Question 1 (MCQ)
        $resAutosave1 = $this->withHeaders($studentHeaders)
            ->patchJson("/api/student/attempts/{$attemptId}/answers", [
                'question_id' => $q1->id,
                'answer_content' => ['option_id' => $opt1A->id],
                'is_flagged' => false
            ]);
        $resAutosave1->assertStatus(200);

        // Test Autosave Answer for Question 2 (Essay)
        $resAutosave2 = $this->withHeaders($studentHeaders)
            ->patchJson("/api/student/attempts/{$attemptId}/answers", [
                'question_id' => $q2->id,
                'answer_content' => ['essay_text' => 'Turunan adalah laju perubahan sesaat fungsi.'],
                'is_flagged' => true
            ]);
        $resAutosave2->assertStatus(200);

        // Test Resume after Disconnect -> Verify answers & timer are preserved
        $resResume = $this->withHeaders($studentHeaders)
            ->getJson("/api/student/attempts/{$attemptId}");
        $resResume->assertStatus(200);
        $this->assertEquals($opt1A->id, $resResume->json('questions.0.answer_content.option_id'));
        $this->assertTrue($resResume->json('questions.1.is_flagged'));

        // Test Proctoring: Log Violation
        $resViolation = $this->withHeaders($studentHeaders)
            ->postJson('/api/student/attempts/violations', [
                'attempt_id' => $attemptId,
                'type' => 'tab_switch',
                'metadata' => ['window' => 'blur']
            ]);
        $resViolation->assertStatus(200)
                     ->assertJson(['violations_count' => 1, 'disqualified' => false]);

        // Test Submit Exam (Fast-accept status)
        $resSubmit1 = $this->withHeaders($studentHeaders)
            ->postJson("/api/student/attempts/{$attemptId}/submit");
        $resSubmit1->assertStatus(200)
                   ->assertJson(['attempt' => ['status' => 'submitted']]);

        // Test Idempotency Guard (Double Submit on same attempt) -> Should return 200 with idempotent response
        $resSubmit2 = $this->withHeaders($studentHeaders)
            ->postJson("/api/student/attempts/{$attemptId}/submit");
        $resSubmit2->assertStatus(200)
                   ->assertJson(['message' => 'Ujian ini telah selesai dikumpulkan sebelumnya.']);

        // Test Autosave after submitted -> Must be rejected with 403
        $resAutosaveAfterSubmit = $this->withHeaders($studentHeaders)
            ->patchJson("/api/student/attempts/{$attemptId}/answers", [
                'question_id' => $q1->id,
                'answer_content' => ['option_id' => $opt1B->id],
                'is_flagged' => false
            ]);
        $resAutosaveAfterSubmit->assertStatus(403);
    }

    /**
     * 3.5 Penilaian, Manual Essay Grading & KKM Calculation
     */
    public function test_3_5_auto_and_manual_grading_kkm_calculation()
    {
        $this->resetAuth();

        $loginStudent = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $studentToken = $loginStudent->json('token');
        $studentSession = $loginStudent->json('session_token');

        $studentHeaders = [
            'Authorization' => 'Bearer ' . $studentToken,
            'X-Session-Token' => $studentSession
        ];

        // Create 2 questions: 1 MCQ Single (50 points) + 1 Essay (50 points)
        $qMCQ = QuestionBank::create([
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Penilaian',
            'type' => 'multiple_choice_single',
            'content' => 'Berapa 10 * 10?',
            'difficulty' => 'easy',
        ]);
        $optCorrect = QuestionOption::create(['question_bank_id' => $qMCQ->id, 'content' => '100', 'is_correct' => true, 'order' => 1]);
        $optWrong = QuestionOption::create(['question_bank_id' => $qMCQ->id, 'content' => '200', 'is_correct' => false, 'order' => 2]);

        $qEssay = QuestionBank::create([
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'topic' => 'Penilaian',
            'type' => 'essay',
            'content' => 'Jelaskan teori probabilitas!',
            'difficulty' => 'medium',
        ]);

        $exam = Exam::create([
            'title' => 'Ujian Evaluasi KKM & Grading',
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'duration_minutes' => 60,
            'start_time' => now()->subMinutes(5),
            'end_time' => now()->addHours(2),
            'kkm_score' => 75,
            'status' => 'published',
            'settings' => ['allow_backtrack' => true, 'allow_flag' => true, 'show_result_immediately' => true]
        ]);
        $exam->questions()->sync([
            $qMCQ->id => ['weight' => 50, 'order' => 1],
            $qEssay->id => ['weight' => 50, 'order' => 2],
        ]);

        $group = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Gelombang 1 Evaluasi',
            'token' => 'KKMTEST',
            'start_time' => now()->subMinutes(5),
            'end_time' => now()->addHours(2)
        ]);
        $group->students()->sync([$this->student->id]);

        // Student starts attempt
        $startRes = $this->withHeaders($studentHeaders)
            ->postJson('/api/student/attempts/start', [
                'exam_group_id' => $group->id,
                'token' => 'KKMTEST'
            ]);
        $attemptId = $startRes->json('attempt.id');

        // Answer MCQ correctly
        $this->withHeaders($studentHeaders)
            ->patchJson("/api/student/attempts/{$attemptId}/answers", [
                'question_id' => $qMCQ->id,
                'answer_content' => ['option_id' => $optCorrect->id],
                'is_flagged' => false
            ]);

        // Answer Essay
        $this->withHeaders($studentHeaders)
            ->patchJson("/api/student/attempts/{$attemptId}/answers", [
                'question_id' => $qEssay->id,
                'answer_content' => ['essay_text' => 'Probabilitas adalah peluang suatu kejadian.'],
                'is_flagged' => false
            ]);

        // Submit attempt
        $this->withHeaders($studentHeaders)
            ->postJson("/api/student/attempts/{$attemptId}/submit");

        // Fetch attempt before manual essay grading -> total_score is null (waiting for essay grade)
        $attemptBeforeGrading = StudentExamAttempt::find($attemptId);
        $this->assertNull($attemptBeforeGrading->total_score);

        // Switch to Teacher login for grading
        $this->resetAuth();
        $loginTeacher = $this->postJson('/api/auth/login', [
            'login' => 'test.teacher@cbt.com',
            'password' => 'password'
        ]);
        $teacherToken = $loginTeacher->json('token');
        $teacherSession = $loginTeacher->json('session_token');

        $teacherHeaders = [
            'Authorization' => 'Bearer ' . $teacherToken,
            'X-Session-Token' => $teacherSession
        ];

        // Teacher grades essay: award 30 points (Total = 50 + 30 = 80 >= KKM 75 -> PASSED)
        $essayAnswer = StudentAnswer::where('attempt_id', $attemptId)
            ->where('question_bank_id', $qEssay->id)
            ->first();

        $gradeRes = $this->withHeaders($teacherHeaders)
            ->postJson("/api/teacher/answers/{$essayAnswer->id}/grade", [
                'score' => 30
            ]);
        $gradeRes->assertStatus(200);

        // Verify Attempt recalculated score and KKM pass
        $attemptAfterGrading = StudentExamAttempt::find($attemptId);
        $this->assertEquals(80.0, (float) $attemptAfterGrading->total_score);
        $this->assertTrue((bool) $attemptAfterGrading->is_passed);

        // Switch back to Student to view results
        $this->resetAuth();
        $loginStudentAgain = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $studentToken2 = $loginStudentAgain->json('token');
        $studentSession2 = $loginStudentAgain->json('session_token');

        $resultRes = $this->withHeaders([
            'Authorization' => 'Bearer ' . $studentToken2,
            'X-Session-Token' => $studentSession2
        ])->getJson("/api/student/results/{$attemptId}");
        
        $resultRes->assertStatus(200)
                  ->assertJson([
                      'results_hidden' => false,
                      'attempt' => [
                          'total_score' => 80,
                          'is_passed' => true
                      ]
                  ]);
    }

    public function test_3_2_3_question_randomization_and_options_consistency()
    {
        $this->resetAuth();

        $loginStudent = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $studentToken = $loginStudent->json('token');
        $studentSession = $loginStudent->json('session_token');

        $headers = [
            'Authorization' => 'Bearer ' . $studentToken,
            'X-Session-Token' => $studentSession
        ];

        // Create an exam with shuffle_questions = true and shuffle_options = true
        $exam = Exam::create([
            'title' => 'Ujian Acak Konsistensi',
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'duration_minutes' => 60,
            'start_time' => now()->subMinutes(5),
            'end_time' => now()->addHours(2),
            'kkm_score' => 75,
            'status' => 'published',
            'settings' => ['shuffle_questions' => true, 'shuffle_options' => true, 'allow_backtrack' => true, 'allow_flag' => true]
        ]);

        $qList = QuestionBank::limit(5)->get();
        $sync = [];
        foreach ($qList as $idx => $q) {
            $sync[$q->id] = ['weight' => 20, 'order' => $idx + 1];
        }
        $exam->questions()->sync($sync);

        $group = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Sesi Acak',
            'token' => 'SHUFFLE1',
            'start_time' => now()->subMinutes(5),
            'end_time' => now()->addHours(2)
        ]);
        $group->students()->sync([$this->student->id]);

        // Start attempt
        $resStart = $this->withHeaders($headers)->postJson('/api/student/attempts/start', [
            'exam_group_id' => $group->id,
            'token' => 'SHUFFLE1'
        ]);
        $resStart->assertStatus(201);
        $attemptId = $resStart->json('attempt.id');
        $initialQuestionIds = collect($resStart->json('questions'))->pluck('question_id')->toArray();

        // Resume attempt (simulating browser refresh / reload)
        $this->resetAuth();
        $loginStudent2 = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $headers2 = [
            'Authorization' => 'Bearer ' . $loginStudent2->json('token'),
            'X-Session-Token' => $loginStudent2->json('session_token')
        ];

        $resResume = $this->withHeaders($headers2)->getJson("/api/student/attempts/{$attemptId}");
        $resResume->assertStatus(200);
        $resumedQuestionIds = collect($resResume->json('questions'))->pluck('question_id')->toArray();

        // Assert that the seeded question order remains persistent across reload
        $this->assertEquals($initialQuestionIds, $resumedQuestionIds);
    }

    public function test_3_3_2_auto_submit_when_timer_expires()
    {
        $this->resetAuth();

        $loginStudent = $this->postJson('/api/auth/login', [
            'login' => 'test.student@cbt.com',
            'password' => 'password'
        ]);
        $studentToken = $loginStudent->json('token');
        $studentSession = $loginStudent->json('session_token');

        $headers = [
            'Authorization' => 'Bearer ' . $studentToken,
            'X-Session-Token' => $studentSession
        ];

        $exam = Exam::create([
            'title' => 'Ujian Durasi Singkat',
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'duration_minutes' => 30,
            'start_time' => now()->subHours(2),
            'end_time' => now()->addHours(2),
            'kkm_score' => 75,
            'status' => 'published',
            'settings' => ['allow_backtrack' => true, 'allow_flag' => true]
        ]);

        $group = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Sesi Expired',
            'token' => 'EXPIRED1',
            'start_time' => now()->subHours(2),
            'end_time' => now()->addHours(2)
        ]);
        $group->students()->sync([$this->student->id]);

        // Create an attempt that was started 45 minutes ago (duration was only 30 minutes)
        $attempt = StudentExamAttempt::create([
            'student_id' => $this->student->id,
            'exam_id' => $exam->id,
            'exam_group_id' => $group->id,
            'status' => 'in_progress',
            'started_at' => now()->subMinutes(45),
            'time_remaining_seconds' => 1800
        ]);

        // Student tries to view/resume the attempt -> should be auto-submitted by server
        $res = $this->withHeaders($headers)->getJson("/api/student/attempts/{$attempt->id}");
        $res->assertStatus(200);

        $attempt->refresh();
        $this->assertEquals('auto_submitted', $attempt->status);
        $this->assertEquals(0, $attempt->time_remaining_seconds);
    }

    public function test_3_5_2_live_monitoring_stats_query()
    {
        $this->resetAuth();

        $loginAdmin = $this->postJson('/api/auth/login', [
            'login' => 'test.admin@cbt.com',
            'password' => 'password'
        ]);
        $token = $loginAdmin->json('token');
        $sessionToken = $loginAdmin->json('session_token');

        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Token' => $sessionToken
        ];

        $res = $this->withHeaders($headers)->getJson('/api/admin/dashboard/live-monitoring');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'stats' => ['active_attempts', 'submitted_attempts', 'disqualified_attempts'],
                'recent_attempts',
                'recent_violations'
            ]);
    }
}
