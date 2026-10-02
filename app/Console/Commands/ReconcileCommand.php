<?php

namespace App\Console\Commands;

use App\Models\WebhookEvent;
use App\Models\ReconciliationRun;
use App\Jobs\ProcessWebhookJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

class ReconcileCommand extends Command
{
    protected $signature = 'hookledger:reconcile';
    protected $description = 'Reconcile local records against Paystack API';

    public function handle(): int
    {
        $run = ReconciliationRun::create(['started_at' => now()]);
        $this->info("Starting reconciliation run #{$run->id}...");

        try {
            $response = Http::withToken(config('hookledger.paystack.secret_key'))
                ->get(config('hookledger.paystack.base_url') . '/transaction', [
                    'perPage' => 100,
                    'status' => 'success'
                ]);

            if ($response->failed()) {
                throw new \Exception("Paystack API error: " . $response->body());
            }

            $transactions = $response->json('data');
            $checked = 0;
            $repaired = 0;
            $logs = [];

            foreach ($transactions as $tx) {
                $checked++;
                $exists = WebhookEvent::where('provider', 'paystack')
                    ->where('event_id', (string) $tx['id'])
                    ->exists();

                if (!$exists) {
                    $event = WebhookEvent::create([
                        'provider' => 'paystack',
                        'event_id' => (string) $tx['id'],
                        'event_type' => 'charge.success',
                        'reference' => $tx['reference'],
                        'payload' => ['data' => $tx, 'event' => 'charge.success', 'reconciled' => true],
                        'status' => 'received',
                        'received_at' => now(),
                    ]);

                    ProcessWebhookJob::dispatch($event->id)->onQueue('webhooks');
                    $repaired++;
                    $logs[] = "Repaired missing event: " . $tx['reference'];
                }
            }

            $run->update([
                'checked_count' => $checked,
                'repaired_count' => $repaired,
                'logs' => $logs,
                'finished_at' => now(),
            ]);

            $this->info("Reconciliation finished. Checked: {$checked}, Repaired: {$repaired}.");

        } catch (Throwable $e) {
            $run->update([
                'failed_count' => 1,
                'logs' => ['error' => $e->getMessage()],
                'finished_at' => now(),
            ]);
            $this->error("Reconciliation failed: " . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
