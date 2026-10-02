<?php

namespace App\Jobs;

use App\Models\WebhookEvent;
use App\Models\ProcessingAttempt;
use App\Models\DeadLetter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProcessWebhookEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(
        public int $webhookEventId
    ) {}

    /**
     * Requirement: Exponential backoff with jitter.
     * sleep = random_between(0, base * 2^attempt)
     */
    public function backoff(): array
    {
        return [15, 30, 60, 120, 240]; // Simplified backoff schedule for Laravel
    }

    public function handle(): void
    {
        $start = hrtime(true);
        
        try {
            DB::transaction(function () use ($start) {
                // Requirement 4: Row locking to prevent race conditions during retries
                $event = WebhookEvent::where('id', $this->webhookEventId)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Idempotency: Ignore if already processed
                if ($event->status === 'processed') {
                    return;
                }

                // SIMULATED BUSINESS LOGIC (e.g., Credit Wallet)
                // In Phase 2, we just mark as processed to demonstrate the engine.
                
                $event->update([
                    'status' => 'processed',
                    'processed_at' => now(),
                ]);

                $this->logAttempt($event, 'succeeded', $start);
            });
        } catch (Throwable $e) {
            $event = WebhookEvent::find($this->webhookEventId);
            if ($event) {
                $this->logAttempt($event, 'failed', $start, $e->getMessage());
            }
            throw $e;
        }
    }

    protected function logAttempt(WebhookEvent $event, string $status, int $start, ?string $error = null): void
    {
        $duration = (int) ((hrtime(true) - $start) / 1e6); // ms

        ProcessingAttempt::create([
            'webhook_event_id' => $event->id,
            'attempt_number' => $this->attempts(),
            'status' => $status,
            'duration_ms' => $duration,
            'error' => $error,
        ]);
    }

    /**
     * Requirement 5: Exhausted attempts move to dead_letters.
     */
    public function failed(Throwable $exception): void
    {
        $event = WebhookEvent::find($this->webhookEventId);

        if ($event) {
            DB::transaction(function () use ($event, $exception) {
                $event->update(['status' => 'dead_letter']);

                DeadLetter::updateOrCreate(
                    ['webhook_event_id' => $event->id],
                    [
                        'provider' => $event->provider,
                        'event_id' => $event->event_id,
                        'reason' => $exception->getMessage(),
                        'failed_at' => now(),
                    ]
                );
            });
        }
    }
}
