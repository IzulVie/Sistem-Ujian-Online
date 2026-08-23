<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->string('code')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('total_questions')->default(0);
            $table->timestamps();
        });

        Schema::table('question_banks', function (Blueprint $table) {
            $table->foreignId('package_id')->nullable()->after('teacher_id')->constrained('question_packages')->onDelete('cascade');
        });

        Schema::table('exams', function (Blueprint $table) {
            $table->foreignId('package_id')->nullable()->after('subject_id')->constrained('question_packages')->onDelete('set null');
        });

        // Backfill: Create default packages for existing question_banks so no data is orphaned
        $existingQuestions = DB::table('question_banks')->get();
        if ($existingQuestions->isNotEmpty()) {
            $grouped = $existingQuestions->groupBy(function ($q) {
                return $q->teacher_id . '_' . $q->subject_id;
            });

            foreach ($grouped as $key => $questions) {
                $first = $questions->first();
                $subject = DB::table('subjects')->where('id', $first->subject_id)->first();
                $subjectName = $subject ? $subject->name : 'Umum';
                $code = 'PKT-' . ($subject ? $subject->code : 'GEN') . '-' . strtoupper(substr(uniqid(), -4));

                $packageId = DB::table('question_packages')->insertGetId([
                    'teacher_id' => $first->teacher_id,
                    'subject_id' => $first->subject_id,
                    'code' => $code,
                    'title' => 'Paket Master Soal ' . $subjectName,
                    'description' => 'Paket berkas soal awal hasil migrasi sistem.',
                    'total_questions' => $questions->count(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('question_banks')
                    ->whereIn('id', $questions->pluck('id'))
                    ->update(['package_id' => $packageId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropForeign(['package_id']);
            $table->dropColumn('package_id');
        });

        Schema::table('question_banks', function (Blueprint $table) {
            $table->dropForeign(['package_id']);
            $table->dropColumn('package_id');
        });

        Schema::dropIfExists('question_packages');
    }
};
