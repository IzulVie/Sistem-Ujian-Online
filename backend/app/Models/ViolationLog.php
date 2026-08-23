<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViolationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'attempt_id',
        'type',
        'occurred_at',
        'metadata',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(StudentExamAttempt::class, 'attempt_id');
    }
}
