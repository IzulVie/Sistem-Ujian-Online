<?php

namespace Database\Seeders;

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
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DummyLoadTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Roles Exist
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $roles = ['super_admin', 'admin', 'guru', 'siswa', 'pengawas'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName]);
        }

        // 2. Create/Get Major & Class
        $major = Major::firstOrCreate(['code' => 'RPL'], [
            'name' => 'Rekayasa Perangkat Lunak',
            'code' => 'RPL'
        ]);

        $class = ClassRoom::firstOrCreate(['name' => 'XII RPL 1'], [
            'name' => 'XII RPL 1',
            'level' => 12,
            'major_id' => $major->id
        ]);

        // 3. Create/Get Academic Year (Active)
        $academicYear = AcademicYear::firstOrCreate(['name' => '2025/2026 Ganjil'], [
            'name' => '2025/2026 Ganjil',
            'semester' => 'odd',
            'is_active' => true
        ]);
        AcademicYear::where('id', '!=', $academicYear->id)->update(['is_active' => false]);
        $academicYear->update(['is_active' => true]);

        // 4. Create/Get Subject
        $subject = Subject::firstOrCreate(['code' => 'SIM-CBT'], [
            'name' => 'Simulasi Ujian Nasional CBT',
            'code' => 'SIM-CBT'
        ]);

        // 5. Create Teacher User
        $teacherUser = User::firstOrCreate(['email' => 'guru.simulasi@cbt.com'], [
            'name' => 'Dr. H. Bambang Sudarsono, M.Pd.',
            'email' => 'guru.simulasi@cbt.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        if (!$teacherUser->hasRole('guru')) {
            $teacherUser->assignRole('guru');
        }

        $teacher = Teacher::firstOrCreate(['user_id' => $teacherUser->id], [
            'user_id' => $teacherUser->id,
            'nip' => '198001012005011001',
        ]);
        $teacher->subjects()->syncWithoutDetaching([$subject->id]);

        // 6. Create Question Bank (30 Soal Beragam Tipe)
        $questions = [];

        // 10 Soal Pilihan Ganda Tunggal (MCQ Single)
        for ($i = 1; $i <= 10; $i++) {
            $q = QuestionBank::create([
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'topic' => 'Aljabar & Kalkulus',
                'type' => 'multiple_choice_single',
                'content' => 'Soal No ' . $i . ': Berapakah nilai dari $$\lim_{x \to 0} \frac{\sin(' . $i . 'x)}{x}$$?',
                'explanation' => 'Gunakan sifat limit trigonometri dasar: limit sin(ax)/x = a, maka hasilnya adalah ' . $i . '.',
                'difficulty' => $i <= 4 ? 'easy' : ($i <= 7 ? 'medium' : 'hard'),
            ]);

            for ($optIdx = 1; $optIdx <= 4; $optIdx++) {
                $val = ($optIdx == 1) ? $i : ($i + $optIdx);
                QuestionOption::create([
                    'question_bank_id' => $q->id,
                    'content' => '$$x = ' . $val . '$$',
                    'is_correct' => ($optIdx == 1),
                    'order' => $optIdx
                ]);
            }
            $questions[] = ['id' => $q->id, 'weight' => 2];
        }

        // 5 Soal Pilihan Ganda Majemuk (MCQ Multi)
        for ($i = 1; $i <= 5; $i++) {
            $q = QuestionBank::create([
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'topic' => 'Karakteristik Bilangan Prima',
                'type' => 'multiple_choice_multi',
                'content' => "Soal Majemuk No {$i}: Pilih semua bilangan yang merupakan bilangan prima di bawah 20!",
                'explanation' => "2, 3, 5, 7, 11, 13, 17, 19 adalah bilangan prima.",
                'difficulty' => 'medium',
            ]);

            $optionsData = [
                ['content' => '2 (Dua)', 'is_correct' => true],
                ['content' => '7 (Tujuh)', 'is_correct' => true],
                ['content' => '9 (Sembilan)', 'is_correct' => false],
                ['content' => '15 (Lima Belas)', 'is_correct' => false],
            ];

            foreach ($optionsData as $idx => $opt) {
                QuestionOption::create([
                    'question_bank_id' => $q->id,
                    'content' => $opt['content'],
                    'is_correct' => $opt['is_correct'],
                    'order' => $idx + 1
                ]);
            }
            $questions[] = ['id' => $q->id, 'weight' => 3];
        }

        // 5 Soal Benar / Salah (True / False)
        for ($i = 1; $i <= 5; $i++) {
            $q = QuestionBank::create([
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'topic' => 'Logika Matematika',
                'type' => 'true_false',
                'content' => 'Pernyataan No ' . $i . ': Nilai dari $$\sqrt{' . ($i * $i) . '} = ' . $i . '$$ adalah benar.',
                'explanation' => 'Akar kuadrat bilangan positif selalu menghasilkan nilai mutlak.',
                'difficulty' => 'easy',
            ]);

            QuestionOption::create([
                'question_bank_id' => $q->id,
                'content' => 'Benar',
                'is_correct' => true,
                'order' => 1
            ]);
            QuestionOption::create([
                'question_bank_id' => $q->id,
                'content' => 'Salah',
                'is_correct' => false,
                'order' => 2
            ]);

            $questions[] = ['id' => $q->id, 'weight' => 2];
        }

        // 5 Soal Menjodohkan (Matching)
        for ($i = 1; $i <= 5; $i++) {
            $q = QuestionBank::create([
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'topic' => 'Konversi Satuan & Simbol',
                'type' => 'matching',
                'content' => 'Soal Menjodohkan No ' . $i . ': Pasangkan besaran fisika berikut dengan satuan SI yang tepat!',
                'explanation' => 'Massa (kg), Panjang (m), Waktu (s).',
                'difficulty' => 'medium',
            ]);

            QuestionMatchingPair::create([
                'question_bank_id' => $q->id,
                'left_item' => 'Kecepatan',
                'right_item' => 'm/s'
            ]);
            QuestionMatchingPair::create([
                'question_bank_id' => $q->id,
                'left_item' => 'Gaya (Force)',
                'right_item' => 'Newton'
            ]);
            QuestionMatchingPair::create([
                'question_bank_id' => $q->id,
                'left_item' => 'Energi',
                'right_item' => 'Joule'
            ]);

            $questions[] = ['id' => $q->id, 'weight' => 4];
        }

        // 5 Soal Essay (Uraian)
        for ($i = 1; $i <= 5; $i++) {
            $q = QuestionBank::create([
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'topic' => 'Analisis Algoritma',
                'type' => 'essay',
                'content' => 'Soal Uraian No ' . $i . ': Jelaskan kompleksitas waktu $$\mathcal{O}(n \log n)$$ pada algoritma Merge Sort!',
                'explanation' => "Merge sort membagi array menjadi dua secara rekursif (log n) dan menggabungkannya dalam waktu linear O(n).",
                'difficulty' => 'hard',
            ]);
            $questions[] = ['id' => $q->id, 'weight' => 5];
        }

        // 7. Create Exam Package
        $exam = Exam::create([
            'title' => 'Simulasi Ujian CBT Skala Besar 500 Peserta',
            'subject_id' => $subject->id,
            'academic_year_id' => $academicYear->id,
            'duration_minutes' => 60,
            'start_time' => now()->subHours(2),
            'end_time' => now()->addHours(10),
            'kkm_score' => 75,
            'status' => 'published',
            'settings' => [
                'allow_backtrack' => true,
                'allow_flag' => true,
                'shuffle_questions' => true,
                'shuffle_options' => true,
                'show_result_immediately' => true,
                'max_tab_switches' => 5,
            ]
        ]);

        // Sync Questions to Exam
        $syncData = [];
        foreach ($questions as $idx => $qData) {
            $syncData[$qData['id']] = [
                'weight' => $qData['weight'],
                'order' => $idx + 1
            ];
        }
        $exam->questions()->sync($syncData);

        // 8. Generate 500 Dummy Students (Bulk insert optimization)
        $passwordHash = Hash::make('password');
        $studentUserRecords = [];
        $studentIdsGroup1 = [];
        $studentIdsGroup2 = [];
        $studentIdsGroup3 = [];

        // Gelombang 1 (Siswa 1 - 150)
        // Gelombang 2 (Siswa 151 - 300)
        // Gelombang 3 (Siswa 301 - 500)
        $group1 = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Gelombang 1 (Sesi Pagi)',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(4),
            'token' => 'SESI01',
            'max_participants' => 150,
        ]);

        $group2 = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Gelombang 2 (Sesi Siang)',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(4),
            'token' => 'SESI02',
            'max_participants' => 150,
        ]);

        $group3 = ExamGroup::create([
            'exam_id' => $exam->id,
            'name' => 'Gelombang 3 (Sesi Sore)',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHours(4),
            'token' => 'SESI03',
            'max_participants' => 200,
        ]);

        for ($i = 1; $i <= 500; $i++) {
            $nisn = str_pad($i, 10, '0', STR_PAD_LEFT);
            $user = User::create([
                'name' => "Siswa Ujian {$i}",
                'username' => $nisn,
                'email' => "siswa{$i}@cbt.com",
                'password' => $passwordHash,
                'is_active' => true,
            ]);
            $user->assignRole('siswa');

            $student = Student::create([
                'user_id' => $user->id,
                'nisn' => $nisn,
                'nis' => "NIS{$i}",
                'class_id' => $class->id,
                'major_id' => $major->id,
            ]);

            if ($i <= 150) {
                $studentIdsGroup1[] = $student->id;
            } elseif ($i <= 300) {
                $studentIdsGroup2[] = $student->id;
            } else {
                $studentIdsGroup3[] = $student->id;
            }
        }

        $group1->students()->sync($studentIdsGroup1);
        $group2->students()->sync($studentIdsGroup2);
        $group3->students()->sync($studentIdsGroup3);
    }
}
