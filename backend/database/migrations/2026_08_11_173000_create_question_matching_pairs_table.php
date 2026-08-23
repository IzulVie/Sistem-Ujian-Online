<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_matching_pairs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_bank_id')->constrained('question_banks')->onDelete('cascade');
            $table->string('left_item');
            $table->string('right_item');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_matching_pairs');
    }
};
