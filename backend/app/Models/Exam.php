<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Exam extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'package_id',
        'subject_id',
        'academic_year_id',
        'duration_minutes',
        'start_time',
        'end_time',
        'settings',
        'kkm_score',
        'status',
    ];

    protected $casts = [
        'settings' => 'array',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(QuestionPackage::class, 'package_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function examGroups(): HasMany
    {
        return $this->hasMany(ExamGroup::class);
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(QuestionBank::class, 'exam_questions', 'exam_id', 'question_bank_id')
            ->withPivot('weight', 'order')
            ->withTimestamps();
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(StudentExamAttempt::class);
    }
}
