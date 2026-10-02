<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'reference',
        'amount_cents',
        'currency',
        'status',
        'customer_email',
        'webhook_event_id',
    ];
}
