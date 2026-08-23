<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->string('topic'); // bab/topik
            $table->enum('difficulty', ['easy', 'medium', 'hard']);
            $table->enum('type', [
                'multiple_choice_single',
                'multiple_choice_multi',
                'essay',
                'true_false',
                'matching'
            ]);
            $table->text('content'); // support LaTeX string
            $table->string('media_url')->nullable(); // image upload URL
            $table->text('explanation')->nullable(); // pembahasan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_banks');
    }
};
