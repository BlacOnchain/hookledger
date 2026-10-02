<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProcessingAttempt extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'webhook_event_id',
        'attempt_number',
        'status',
        'duration_ms',
        'error',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
