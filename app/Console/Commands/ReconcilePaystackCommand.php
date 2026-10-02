<?php

namespace App\Console\Commands;

use App\Models\WebhookEvent;
use App\Models\ReconciliationRun;
use App\Jobs\ProcessWebhookEventJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReconcilePaystackCommand extends Command
{
    protected $signature = 'hookledger:reconcile';
    protected $description = 'Reconcile local records against Paystack API';

    public function handle(): int
    {
        $run = ReconciliationRun::create(['started_at' => now()]);
        
        $this->info("Starting reconciliation run #{$run->id}...");

        try {
            // Requirement 8: Fetch recent transactions from Paystack (Test Mode)
            // In a real app, we'd use a secret from config
            $response = Http::withToken(config('services.paystack.secret'))
                ->get('https://api.paystack.co/transaction', [
                    'perPage' => 50,
                    'status' => 'success'
                ]);

            if ($response->failed()) {
                throw new \Exception("Paystack API call failed: " . $response->body());
            }

            $transactions = $response->json('data');
            $checked = 0;
            $repaired = 0;

            foreach ($transactions as $tx) {
                $checked++;
                
                // Check if we have this event
                $exists = WebhookEvent::where('provider', 'paystack')
                    ->where('event_id', (string) $tx['id'])
                    ->exists();

                if (! $exists) {
                    // Repair: Create missing event
                    $event = WebhookEvent::create([
                        'provider' => 'paystack',
                        'event_id' => (string) $tx['id'],
                        'event_type' => 'charge.success',
                        'reference' => $tx['reference'],
                        'payload' => $tx,
                        'raw_payload' => json_encode($tx),
                        'status' => 'pending',
                    ]);

                    ProcessWebhookEventJob::dispatch($event->id);
                    $repaired++;
                }
            }

            $run->update([
                'checked_count' => $checked,
                'repaired_count' => $repaired,
                'finished_at' => now(),
            ]);

            $this->info("Done. Checked: {$checked}, Repaired: {$repaired}.");

        } catch (\Throwable $e) {
            $run->update([
                'failed_count' => 1,
                'errors' => ['message' => $e->getMessage()],
                'finished_at' => now(),
            ]);
            $this->error("Reconciliation failed: " . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
