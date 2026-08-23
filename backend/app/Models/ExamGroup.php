<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'name',
        'start_time',
        'end_time',
        'token',
        'max_participants',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'exam_group_students', 'exam_group_id', 'student_id')
            ->withTimestamps();
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(StudentExamAttempt::class);
    }
}
