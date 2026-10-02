<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeadLetter extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'webhook_event_id',
        'provider',
        'event_id',
        'reason',
        'failed_at',
        'replayed_at',
    ];

    protected $casts = [
        'failed_at' => 'datetime',
        'replayed_at' => 'datetime',
    ];
}
