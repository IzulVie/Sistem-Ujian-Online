<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('student_exam_attempts', function (Blueprint $table) {
            $table->index(['student_id', 'exam_id', 'exam_group_id'], 'idx_attempts_lookup');
            $table->index(['exam_id', 'status'], 'idx_attempts_status');
        });

        Schema::table('student_answers', function (Blueprint $table) {
            $table->index(['attempt_id', 'question_bank_id'], 'idx_answers_attempt_question');
        });

        Schema::table('exam_questions', function (Blueprint $table) {
            $table->index(['exam_id', 'question_bank_id'], 'idx_exam_questions_lookup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_exam_attempts', function (Blueprint $table) {
            $table->dropIndex('idx_attempts_lookup');
            $table->dropIndex('idx_attempts_status');
        });

        Schema::table('student_answers', function (Blueprint $table) {
            $table->dropIndex('idx_answers_attempt_question');
        });

        Schema::table('exam_questions', function (Blueprint $table) {
            $table->dropIndex('idx_exam_questions_lookup');
        });
    }
};
