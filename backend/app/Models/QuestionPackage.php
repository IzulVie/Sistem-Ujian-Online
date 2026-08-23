<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuestionPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'subject_id',
        'code',
        'title',
        'description',
        'total_questions',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(QuestionBank::class, 'package_id');
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class, 'package_id');
    }

    /**
     * Recalculate and update the cached total_questions count
     */
    public function syncTotalQuestions(): int
    {
        $count = $this->questions()->count();
        $this->update(['total_questions' => $count]);
        return $count;
    }
}
