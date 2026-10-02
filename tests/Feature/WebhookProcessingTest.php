<?php

namespace Tests\Feature;

use App\Models\WebhookEvent;
use App\Models\Payment;
use App\Jobs\ProcessWebhookJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WebhookProcessingTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_processes_charge_success_idempotently()
    {
        $event = WebhookEvent::create([
            'provider' => 'paystack',
            'event_id' => 'evt_123',
            'event_type' => 'charge.success',
            'reference' => 'ref_123',
            'payload' => [
                'data' => [
                    'amount' => 500000,
                    'currency' => 'NGN',
                    'customer' => ['email' => 'test@example.com']
                ]
            ],
            'status' => 'received',
        ]);

        ProcessWebhookJob::dispatchSync($event->id);

        $event->refresh();
        $this->assertEquals('processed', $event->status);
        $this->assertDatabaseHas('payments', [
            'reference' => 'ref_123',
            'status' => 'paid',
            'amount_cents' => 500000
        ]);

        // Run again to test idempotency
        ProcessWebhookJob::dispatchSync($event->id);
        $this->assertEquals(1, Payment::count());
    }

    public function test_it_moves_to_dead_letters_after_max_failures()
    {
        $event = WebhookEvent::create([
            'provider' => 'paystack',
            'event_id' => 'evt_fail',
            'event_type' => 'charge.success',
            'reference' => 'ref_fail',
            'payload' => [],
            'status' => 'received',
        ]);

        // Mock a failure by passing invalid data to the job
        $job = new ProcessWebhookJob($event->id);
        
        try {
            $job->handle();
        } catch (\Throwable $e) {
            $job->failed($e);
        }

        $this->assertDatabaseHas('webhook_events', [
            'id' => $event->id,
            'status' => 'failed'
        ]);

        $this->assertDatabaseHas('dead_letters', [
            'webhook_event_id' => $event->id
        ]);
    }
}
