<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('exam_id')->constrained('exams')->onDelete('cascade');
            $table->foreignId('exam_group_id')->constrained('exam_groups')->onDelete('cascade');
            $table->enum('status', [
                'not_started',
                'in_progress',
                'submitted',
                'auto_submitted',
                'disqualified'
            ])->default('not_started');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('submitted_at')->nullable();
            $table->integer('time_remaining_seconds')->default(0);
            $table->decimal('total_score', 5, 2)->nullable();
            $table->boolean('is_passed')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_exam_attempts');
    }
};
