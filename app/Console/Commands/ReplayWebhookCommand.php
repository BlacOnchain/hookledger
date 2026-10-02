<?php

namespace App\Console\Commands;

use App\Models\WebhookEvent;
use App\Models\DeadLetter;
use App\Jobs\ProcessWebhookEventJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReplayWebhookCommand extends Command
{
    protected $signature = 'hookledger:replay {event_id? : The ID of the event to replay} {--dead : Replay all dead-lettered events}';

    protected $description = 'Replay a specific webhook event or all dead-lettered events';

    public function handle(): int
    {
        if ($this->option('dead')) {
            $count = 0;
            DeadLetter::whereNull('replayed_at')->chunkById(100, function ($letters) use (&$count) {
                foreach ($letters as $letter) {
                    $this->replay($letter->webhook_event_id);
                    $letter->update(['replayed_at' => now()]);
                    $count++;
                }
            });
            $this->info("Successfully re-queued {$count} dead-lettered events.");
            return self::SUCCESS;
        }

        $eventId = $this->argument('event_id');

        if (! $eventId) {
            $this->error('Please provide an event_id or use the --dead flag.');
            return self::FAILURE;
        }

        $this->replay((int) $eventId);
        $this->info("Successfully re-queued event ID: {$eventId}.");

        return self::SUCCESS;
    }

    protected function replay(int $id): void
    {
        $event = WebhookEvent::findOrFail($id);
        
        // Reset status to pending so the job processes it again
        $event->update(['status' => 'pending']);
        
        ProcessWebhookEventJob::dispatch($id)->onQueue('webhooks');
    }
}
