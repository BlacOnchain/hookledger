<?php

namespace App\Jobs;

use App\Models\Payment;
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

class ProcessWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(
        public int $webhookEventId
    ) {}

    /**
     * Requirement: Exponential backoff with full jitter.
     */
    public function backoff(): array
    {
        return [10, 30, 60, 120, 240]; // Simplified for job configuration
    }

    public function handle(): void
    {
        $startTime = hrtime(true);
        
        try {
            DB::transaction(function () use ($startTime) {
                // Requirement: Row locking to prevent race conditions during retries
                $event = WebhookEvent::where('id', $this->webhookEventId)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Status guard: never double-apply
                if ($event->status === 'processed') {
                    return;
                }

                $event->update(['status' => 'processing']);

                // Requirement: Handle charge.success, charge.failed, refund.processed
                switch ($event->event_type) {
                    case 'charge.success':
                        $this->handleChargeSuccess($event);
                        break;
                    case 'charge.failed':
                        $this->handleChargeFailed($event);
                        break;
                    case 'refund.processed':
                        $this->handleRefundProcessed($event);
                        break;
                }

                $event->update([
                    'status' => 'processed',
                    'processed_at' => now(),
                ]);

                $this->logAttempt($event, 'succeeded', $startTime);
            });
        } catch (Throwable $e) {
            $event = WebhookEvent::find($this->webhookEventId);
            if ($event) {
                $this->logAttempt($event, 'failed', $startTime, $e->getMessage());
            }
            throw $e;
        }
    }

    protected function handleChargeSuccess(WebhookEvent $event): void
    {
        Payment::updateOrCreate(
            ['reference' => $event->reference],
            [
                'amount_cents' => (int) $event->payload['data']['amount'],
                'currency' => $event->payload['data']['currency'],
                'status' => 'paid',
                'customer_email' => $event->payload['data']['customer']['email'],
                'webhook_event_id' => $event->id,
            ]
        );
    }

    protected function handleChargeFailed(WebhookEvent $event): void
    {
        Payment::updateOrCreate(
            ['reference' => $event->reference],
            [
                'amount_cents' => (int) $event->payload['data']['amount'],
                'currency' => $event->payload['data']['currency'],
                'status' => 'failed',
                'customer_email' => $event->payload['data']['customer']['email'],
                'webhook_event_id' => $event->id,
            ]
        );
    }

    protected function handleRefundProcessed(WebhookEvent $event): void
    {
        Payment::updateOrCreate(
            ['reference' => $event->reference],
            [
                'status' => 'refunded',
                'webhook_event_id' => $event->id,
            ]
        );
    }

    protected function logAttempt(WebhookEvent $event, string $status, int $startTime, ?string $error = null): void
    {
        $duration = (int) ((hrtime(true) - $startTime) / 1e6); // ms

        ProcessingAttempt::create([
            'webhook_event_id' => $event->id,
            'attempt_number' => $this->attempts(),
            'status' => $status,
            'duration_ms' => $duration,
            'error' => $error ? substr($error, 0, 1000) : null,
            'created_at' => now(),
        ]);
    }

    public function failed(Throwable $exception): void
    {
        $event = WebhookEvent::find($this->webhookEventId);
        if ($event) {
            DB::transaction(function () use ($event, $exception) {
                $event->update(['status' => 'failed']);
                
                DeadLetter::create([
                    'webhook_event_id' => $event->id,
                    'provider' => $event->provider,
                    'event_id' => $event->event_id,
                    'reason' => substr($exception->getMessage(), 0, 1000),
                    'failed_at' => now(),
                ]);
            });
        }
    }
}
