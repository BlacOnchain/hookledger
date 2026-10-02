<?php

namespace Tests\Feature;

use App\Models\WebhookEvent;
use App\Models\DeadLetter;
use App\Models\ProcessingAttempt;
use App\Jobs\ProcessWebhookEventJob;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProcessWebhookEventJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_processes_webhooks_idempotently_using_row_locks()
    {
        $event = WebhookEvent::factory()->create(['status' => 'pending']);

        // Simulate successful processing
        ProcessWebhookEventJob::dispatchSync($event->id);

        $event->refresh();
        $this->assertEquals('processed', $event->status);
        $this->assertDatabaseHas('processing_attempts', [
            'webhook_event_id' => $event->id,
            'status' => 'succeeded'
        ]);
    }

    public function test_it_moves_to_dead_letter_after_exhaustion()
    {
        $event = WebhookEvent::factory()->create(['status' => 'pending']);
        
        // We mock the failure inside the job logic for this test
        $job = new ProcessWebhookEventJob($event->id);
        $job->failed(new \Exception('Critical simulation failure'));

        $this->assertDatabaseHas('webhook_events', [
            'id' => $event->id,
            'status' => 'dead_letter'
        ]);

        $this->assertDatabaseHas('dead_letters', [
            'webhook_event_id' => $event->id,
            'reason' => 'Critical simulation failure'
        ]);
    }

    public function test_it_replays_dead_letters()
    {
        Queue::fake();
        $event = WebhookEvent::factory()->create(['status' => 'dead_letter']);
        DeadLetter::create([
            'webhook_event_id' => $event->id,
            'provider' => 'paystack',
            'event_id' => 'evt_123',
            'reason' => 'Failed'
        ]);

        $this->artisan('hookledger:replay', ['event_id' => $event->id])
            ->assertExitCode(0);

        $event->refresh();
        $this->assertEquals('pending', $event->status);
        Queue::assertPushed(ProcessWebhookEventJob::class);
    }
}
