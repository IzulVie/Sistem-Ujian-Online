<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'attempt_id',
        'question_bank_id',
        'answer_content',
        'is_flagged',
        'score',
        'graded_by',
        'graded_at',
    ];

    protected $casts = [
        'answer_content' => 'array',
        'is_flagged' => 'boolean',
        'score' => 'float',
        'graded_at' => 'datetime',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(StudentExamAttempt::class, 'attempt_id');
    }

    public function questionBank(): BelongsTo
    {
        return $this->belongsTo(QuestionBank::class, 'question_bank_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'graded_by');
    }
}
