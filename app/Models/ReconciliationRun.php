<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReconciliationRun extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'checked_count',
        'repaired_count',
        'failed_count',
        'logs',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'logs' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];
}
