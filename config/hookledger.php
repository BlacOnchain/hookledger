<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Paystack Configuration
    |--------------------------------------------------------------------------
    */
    'paystack' => [
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'base_url' => env('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Engine Tuning
    |--------------------------------------------------------------------------
    */
    'max_attempts' => (int) env('HOOKLEDGER_MAX_ATTEMPTS', 5),
    'replay_token' => env('HOOKLEDGER_REPLAY_API_TOKEN'),
];
