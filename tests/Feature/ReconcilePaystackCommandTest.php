<?php

namespace Tests\Feature;

use App\Models\WebhookEvent;
use App\Models\ReconciliationRun;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReconcilePaystackCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reconciles_missing_transactions_from_paystack()
    {
        Http::fake([
            'api.paystack.co/transaction*' => Http::response([
                'data' => [
                    [
                        'id' => 'psk_999',
                        'reference' => 'REF_NEW',
                        'amount' => 5000,
                    ]
                ]
            ], 200)
        ]);

        $this->artisan('hookledger:reconcile')
            ->assertExitCode(0);

        $this->assertDatabaseHas('webhook_events', [
            'event_id' => 'psk_999',
            'reference' => 'REF_NEW'
        ]);

        $this->assertDatabaseHas('reconciliation_runs', [
            'checked_count' => 1,
            'repaired_count' => 1
        ]);
    }
}
