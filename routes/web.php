<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth', \App\Http\Middleware\SecurityHeaders::class])->group(function () {
    Route::get('/', function () {
        return view('dashboard');
    })->name('dashboard');

    Route::get('/events', [\App\Http\Controllers\EventController::class, 'index'])->name('events.index');
    Route::get('/events/{event}', [\App\Http\Controllers\EventController::class, 'show'])->name('events.show');
    Route::post('/events/{event}/replay', function (\App\Models\WebhookEvent $event) {
        $event->update(['status' => 'received']);
        \App\Jobs\ProcessWebhookJob::dispatch($event->id)->onQueue('webhooks');
        return back();
    })->name('events.replay');

    Route::get('/dead-letters', function () {
        $letters = \App\Models\DeadLetter::latest()->paginate(25);
        return view('dead-letters.index', compact('letters'));
    })->name('dead-letters.index');
});

// require __DIR__.'/auth.php'; // Skipping auth for now to allow previewing
