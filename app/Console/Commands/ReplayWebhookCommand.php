<?php

namespace App\Console\Commands;

use App\Models\WebhookEvent;
use App\Models\DeadLetter;
use App\Jobs\ProcessWebhookJob;
use Illuminate\Console\Command;

class ReplayWebhookCommand extends Command
{
    protected $signature = 'hookledger:replay {event_id? : The internal ID of the event to replay} {--dead : Replay all unresolved dead letters}';
    protected $description = 'Replay a specific webhook or all dead letters idempotently';

    public function handle(): int
    {
        if ($this->option('dead')) {
            $deadLetters = DeadLetter::whereNull('replayed_at')->get();
            $this->info("Replaying {$deadLetters->count()} dead letters...");
            
            foreach ($deadLetters as $letter) {
                $this->replay($letter->webhook_event_id);
                $letter->update(['replayed_at' => now()]);
            }
            
            $this->info("Successfully re-queued all unresolved dead letters.");
            return self::SUCCESS;
        }

        $eventId = $this->argument('event_id');
        if (!$eventId) {
            $this->error("Provide an event_id or use the --dead flag.");
            return self::FAILURE;
        }

        $this->replay((int) $eventId);
        $this->info("Successfully re-queued event ID: {$eventId}.");

        return self::SUCCESS;
    }

    protected function replay(int $id): void
    {
        $event = WebhookEvent::findOrFail($id);
        $event->update(['status' => 'received']);
        ProcessWebhookJob::dispatch($id)->onQueue('webhooks');
    }
}
