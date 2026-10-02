<?php

use App\Http\Controllers\PaystackWebhookController;
use App\Http\Middleware\VerifyPaystackSignature;
use Illuminate\Support\Facades\Route;

Route::post('/webhooks/paystack', PaystackWebhookController::class)
    ->middleware(VerifyPaystackSignature::class);

Route::post('/webhooks/replay', \App\Http\Controllers\ReplayApiController::class);
