<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Major;
use App\Models\ClassRoom;
use App\Models\Subject;
use App\Models\AcademicYear;
use App\Models\QuestionPackage;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\QuestionMatchingPair;
use App\Models\Exam;
use App\Models\ExamGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $roles = ['super_admin', 'admin', 'guru', 'siswa', 'pengawas'];
        foreach ($roles as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        // 2. Academic Year
        $academicYear = AcademicYear::firstOrCreate(
            ['name' => '2026/2027 Ganjil'],
            ['semester' => 'odd', 'is_active' => true]
        );
        $academicYear->update(['is_active' => true]);

        // 3. Majors & Classes
        $majorRpl = Major::firstOrCreate(['code' => 'RPL'], ['name' => 'Rekayasa Perangkat Lunak']);
        $majorTkj = Major::firstOrCreate(['code' => 'TKJ'], ['name' => 'Teknik Komputer & Jaringan']);
        $majorIpa = Major::firstOrCreate(['code' => 'MIPA'], ['name' => 'Matematika & IPA']);

        $class12Rpl = ClassRoom::firstOrCreate(['name' => 'XII RPL 1'], ['level' => 12, 'major_id' => $majorRpl->id]);
        $class12Mipa = ClassRoom::firstOrCreate(['name' => 'XII MIPA 1'], ['level' => 12, 'major_id' => $majorIpa->id]);

        // 4. Subjects
        $subjMtk = Subject::firstOrCreate(['name' => 'Matematika Wajib'], ['code' => 'MTK-WAJIB']);
        $subjWeb = Subject::firstOrCreate(['name' => 'Pemrograman Web'], ['code' => 'PROG-WEB']);
        $subjFis = Subject::firstOrCreate(['name' => 'Fisika Terapan'], ['code' => 'FIS-TRP']);

        // 5. Admin & Teachers
        $admin = User::firstOrCreate(['email' => 'admin@cbt.com'], [
            'name' => 'Super Admin',
            'username' => 'admin',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $admin->syncRoles(['super_admin', 'admin']);
        $admin->update(['password' => Hash::make('password'), 'is_active' => true]);

        $guruSim = User::firstOrCreate(['email' => 'guru.simulasi@cbt.com'], [
            'name' => 'Dr. H. Bambang Sudarsono, M.Pd.',
            'username' => 'guru.simulasi',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $guruSim->syncRoles(['guru']);
        $guruSim->update(['password' => Hash::make('password'), 'is_active' => true]);
        $teacherSim = Teacher::firstOrCreate(['user_id' => $guruSim->id], ['nip' => '198001012005011001']);
        $teacherSim->subjects()->syncWithoutDetaching([$subjMtk->id, $subjWeb->id, $subjFis->id]);

        $guruBudi = User::firstOrCreate(['email' => 'budi@cbt.com'], [
            'name' => 'Budi Santoso, S.Pd.',
            'username' => 'budi',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $guruBudi->syncRoles(['guru']);
        $guruBudi->update(['password' => Hash::make('password'), 'is_active' => true]);
        $teacherBudi = Teacher::firstOrCreate(['user_id' => $guruBudi->id], ['nip' => '198501012010011002']);
        $teacherBudi->subjects()->syncWithoutDetaching([$subjMtk->id]);

        // 6. Students
        $studentsList = [
            ['email' => 'siswa1@cbt.com', 'username' => 'siswa1', 'name' => 'Ahmad Fauzi (Siswa 1)', 'nisn' => '1122334455', 'nis' => '1001', 'class_id' => $class12Rpl->id, 'major_id' => $majorRpl->id],
            ['email' => 'siswa.simulasi@cbt.com', 'username' => 'siswa.simulasi', 'name' => 'Siti Rahmawati (Peserta Simulasi)', 'nisn' => '9988776655', 'nis' => '1002', 'class_id' => $class12Rpl->id, 'major_id' => $majorRpl->id],
            ['email' => 'izul@cbt.com', 'username' => '1234567890', 'name' => 'Izul Fitra', 'nisn' => '1234567890', 'nis' => '1003', 'class_id' => $class12Mipa->id, 'major_id' => $majorIpa->id],
        ];

        $studentModels = [];
        foreach ($studentsList as $std) {
            $u = User::firstOrCreate(['email' => $std['email']], [
                'name' => $std['name'],
                'username' => $std['username'],
                'password' => Hash::make('password'),
                'is_active' => true,
            ]);
            $u->syncRoles(['siswa']);
            $u->update(['password' => Hash::make('password'), 'is_active' => true]);

            $s = Student::firstOrCreate(['user_id' => $u->id], [
                'nisn' => $std['nisn'],
                'nis' => $std['nis'],
                'class_id' => $std['class_id'],
                'major_id' => $std['major_id'],
            ]);
            $studentModels[] = $s;
        }

        // 7. Create Question Package 1: Matematika Wajib (Guru Simulasi)
        $pkgMtk = QuestionPackage::firstOrCreate(
            ['code' => 'PKT-MTK-SIM'],
            [
                'teacher_id' => $teacherSim->id,
                'subject_id' => $subjMtk->id,
                'title' => 'Paket Master Soal Matematika Wajib Kelas XII',
                'description' => 'Paket berisi kumpulan butir soal kalkulus, trigonometri, aljabar, dan matriks lengkap dengan kunci jawaban.',
                'total_questions' => 0,
            ]
        );

        // Delete old questions in this package to re-seed cleanly
        $pkgMtk->questions()->delete();

        // 1. PG Tunggal 1
        $q1 = QuestionBank::create([
            'package_id' => $pkgMtk->id,
            'subject_id' => $subjMtk->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'Kalkulus & Limit',
            'type' => 'multiple_choice_single',
            'content' => 'Berapakah nilai limit dari fungsi berikut: $$\lim_{x \to 0} \frac{\sin(4x)}{2x}$$ ?',
            'explanation' => 'Gunakan rumus dasar limit: $$\lim_{x \to 0} \frac{\sin(ax)}{bx} = \frac{a}{b} = \frac{4}{2} = 2$$.',
            'difficulty' => 'easy',
        ]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '$$2$$', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '$$4$$', 'is_correct' => false, 'order' => 2]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '$$\frac{1}{2}$$', 'is_correct' => false, 'order' => 3]);
        QuestionOption::create(['question_bank_id' => $q1->id, 'content' => '$$0$$', 'is_correct' => false, 'order' => 4]);

        // 2. PG Tunggal 2
        $q2 = QuestionBank::create([
            'package_id' => $pkgMtk->id,
            'subject_id' => $subjMtk->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'Integral Tentu',
            'type' => 'multiple_choice_single',
            'content' => 'Tentukan hasil integral tentu berikut: $$\int_{0}^{2} (3x^2 + 2x) \, dx$$',
            'explanation' => 'Anti-turunannya adalah $$x^3 + x^2$$. Evaluasi pada batas [0, 2]: $$(2^3 + 2^2) - 0 = 8 + 4 = 12$$.',
            'difficulty' => 'medium',
        ]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '$$12$$', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '$$10$$', 'is_correct' => false, 'order' => 2]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '$$14$$', 'is_correct' => false, 'order' => 3]);
        QuestionOption::create(['question_bank_id' => $q2->id, 'content' => '$$16$$', 'is_correct' => false, 'order' => 4]);

        // 3. PG Majemuk (Multiple Choice Multi)
        $q3 = QuestionBank::create([
            'package_id' => $pkgMtk->id,
            'subject_id' => $subjMtk->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'Teori Bilangan',
            'type' => 'multiple_choice_multi',
            'content' => 'Pilihlah **semua** bilangan prima di bawah ini yang lebih besar dari 10 dan kurang dari 25!',
            'explanation' => 'Bilangan prima antara 10 dan 25 adalah 11, 13, 17, 19, 23.',
            'difficulty' => 'medium',
        ]);
        QuestionOption::create(['question_bank_id' => $q3->id, 'content' => '13 (Tiga Belas)', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $q3->id, 'content' => '17 (Tujuh Belas)', 'is_correct' => true, 'order' => 2]);
        QuestionOption::create(['question_bank_id' => $q3->id, 'content' => '21 (Dua Puluh Satu)', 'is_correct' => false, 'order' => 3]);
        QuestionOption::create(['question_bank_id' => $q3->id, 'content' => '23 (Dua Puluh Tiga)', 'is_correct' => true, 'order' => 4]);

        // 4. Benar / Salah
        $q4 = QuestionBank::create([
            'package_id' => $pkgMtk->id,
            'subject_id' => $subjMtk->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'Trigonometri Dasar',
            'type' => 'true_false',
            'content' => 'Identitas trigonometri: $$\sin^2(\theta) + \cos^2(\theta) = 1$$ berlaku untuk setiap sudut real $$\theta$$.',
            'explanation' => 'Ini adalah identitas Pythagoras dasar dalam trigonometri yang selalu bernilai benar.',
            'difficulty' => 'easy',
        ]);
        QuestionOption::create(['question_bank_id' => $q4->id, 'content' => 'Benar', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $q4->id, 'content' => 'Salah', 'is_correct' => false, 'order' => 2]);

        // 5. Menjodohkan (Matching)
        $q5 = QuestionBank::create([
            'package_id' => $pkgMtk->id,
            'subject_id' => $subjMtk->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'Turunan Fungsi',
            'type' => 'matching',
            'content' => 'Jodohkan fungsi matematika di kolom kiri dengan turunan pertamanya $$f\'(x)$$ di kolom kanan!',
            'explanation' => 'd/dx sin(x) = cos(x), d/dx x^3 = 3x^2, d/dx ln(x) = 1/x.',
            'difficulty' => 'medium',
        ]);
        QuestionMatchingPair::create(['question_bank_id' => $q5->id, 'left_item' => 'f(x) = sin(x)', 'right_item' => 'cos(x)']);
        QuestionMatchingPair::create(['question_bank_id' => $q5->id, 'left_item' => 'f(x) = x^3', 'right_item' => '3x^2']);
        QuestionMatchingPair::create(['question_bank_id' => $q5->id, 'left_item' => 'f(x) = ln(x)', 'right_item' => '1/x']);

        // 6. Essay (Uraian)
        $q6 = QuestionBank::create([
            'package_id' => $pkgMtk->id,
            'subject_id' => $subjMtk->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'Penerapan Turunan Maksimum/Minimum',
            'type' => 'essay',
            'content' => 'Sebuah kawat sepanjang 100 meter akan dibuat persegi panjang. Tentukan ukuran panjang dan lebar agar luas daerah yang dibatasi mencapai nilai maksimum, sertakan langkah penurunannya!',
            'explanation' => 'Keliling: 2(p+l) = 100 => l = 50 - p. Luas L = p(50-p) = 50p - p^2. Turunan L\' = 50 - 2p = 0 => p = 25 meter dan l = 25 meter. Luas maksimum = 625 m^2.',
            'difficulty' => 'hard',
        ]);

        $pkgMtk->syncTotalQuestions();

        // 8. Create Question Package 2: Pemrograman Web (Guru Simulasi)
        $pkgWeb = QuestionPackage::firstOrCreate(
            ['code' => 'PKT-WEB-01'],
            [
                'teacher_id' => $teacherSim->id,
                'subject_id' => $subjWeb->id,
                'title' => 'Paket Soal Pemrograman Web Modern (HTML, CSS & JS)',
                'description' => 'Materi mencakup DOM Manipulation, CSS Flexbox & Grid, ES6 syntax, dan REST API integration.',
                'total_questions' => 0,
            ]
        );
        $pkgWeb->questions()->delete();

        $qw1 = QuestionBank::create([
            'package_id' => $pkgWeb->id,
            'subject_id' => $subjWeb->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'JavaScript Modern (ES6)',
            'type' => 'multiple_choice_single',
            'content' => 'Metode array JavaScript manakah yang digunakan untuk membuat array baru dengan hasil pemanggilan fungsi pada setiap elemen array pemanggil?',
            'explanation' => 'Array.prototype.map() mengiterasi dan menghasilkan array baru.',
            'difficulty' => 'easy',
        ]);
        QuestionOption::create(['question_bank_id' => $qw1->id, 'content' => 'Array.prototype.map()', 'is_correct' => true, 'order' => 1]);
        QuestionOption::create(['question_bank_id' => $qw1->id, 'content' => 'Array.prototype.forEach()', 'is_correct' => false, 'order' => 2]);
        QuestionOption::create(['question_bank_id' => $qw1->id, 'content' => 'Array.prototype.filter()', 'is_correct' => false, 'order' => 3]);
        QuestionOption::create(['question_bank_id' => $qw1->id, 'content' => 'Array.prototype.reduce()', 'is_correct' => false, 'order' => 4]);

        $qw2 = QuestionBank::create([
            'package_id' => $pkgWeb->id,
            'subject_id' => $subjWeb->id,
            'teacher_id' => $teacherSim->id,
            'topic' => 'HTTP & RESTful API',
            'type' => 'essay',
            'content' => 'Jelaskan perbedaan mendasar antara HTTP Method `POST` dan `PUT` dalam arsitektur REST API serta berikan contoh skenario penggunaannya!',
            'explanation' => 'POST digunakan untuk membuat resource baru (non-idempoten), sedangkan PUT digunakan untuk memperbarui/mengganti resource secara utuh (idempoten).',
            'difficulty' => 'medium',
        ]);

        $pkgWeb->syncTotalQuestions();

        // 9. Create Active Exam Schedule
        $exam = Exam::firstOrCreate(
            ['title' => 'Simulasi Ujian Semester CBT 2026'],
            [
                'package_id' => $pkgMtk->id,
                'subject_id' => $subjMtk->id,
                'academic_year_id' => $academicYear->id,
                'duration_minutes' => 60,
                'start_time' => now()->subHour(),
                'end_time' => now()->addDays(7),
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
            ]
        );

        $examQuestions = $pkgMtk->questions()->get();
        $syncWeights = [];
        foreach ($examQuestions as $idx => $eq) {
            $weight = $eq->type === 'essay' ? 5 : ($eq->type === 'matching' ? 4 : 2);
            $syncWeights[$eq->id] = ['weight' => $weight, 'order' => $idx + 1];
        }
        $exam->questions()->sync($syncWeights);

        // 10. Exam Group (Token: SIMULASI)
        $group = ExamGroup::firstOrCreate(
            ['exam_id' => $exam->id, 'name' => 'Gelombang 1 — Kelas XII RPL & MIPA'],
            [
                'start_time' => now()->subHour(),
                'end_time' => now()->addDays(7),
                'token' => 'SIMULASI',
                'max_participants' => 100,
            ]
        );
        $group->update(['token' => 'SIMULASI']);

        // Assign all students to this group
        $studentIds = array_map(fn($s) => $s->id, $studentModels);
        $group->students()->syncWithoutDetaching($studentIds);
    }
}
