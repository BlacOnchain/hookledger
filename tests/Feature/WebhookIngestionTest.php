<?php

namespace Tests\Feature;

use App\Models\WebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class WebhookIngestionTest extends TestCase
{
    use RefreshDatabase;

    private string $secret = 'sk_test_secret';

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('hookledger.paystack.secret_key', $this->secret);
    }

    public function test_it_rejects_unsigned_webhooks()
    {
        $this->postJson('/api/webhooks/paystack', [])
            ->assertStatus(401);
    }

    public function test_it_rejects_badly_signed_webhooks()
    {
        $this->postJson('/api/webhooks/paystack', [], [
            'x-paystack-signature' => 'invalid'
        ])->assertStatus(401);
    }

    public function test_it_ingests_valid_signed_webhooks()
    {
        $payload = [
            'event' => 'charge.success',
            'data' => [
                'id' => 'evt_123',
                'reference' => 'ref_456',
                'amount' => 5000
            ]
        ];

        $json = json_encode($payload);
        $signature = hash_hmac('sha512', $json, $this->secret);

        $this->postJson('/api/webhooks/paystack', $payload, [
            'x-paystack-signature' => $signature
        ])->assertStatus(200)
          ->assertJson(['status' => 'accepted']);

        $this->assertDatabaseHas('webhook_events', [
            'event_id' => 'evt_123',
            'reference' => 'ref_456'
        ]);
    }

    public function test_it_is_idempotent_and_returns_200_for_duplicates()
    {
        $payload = [
            'event' => 'charge.success',
            'data' => [
                'id' => 'evt_123',
                'reference' => 'ref_456'
            ]
        ];

        $json = json_encode($payload);
        $signature = hash_hmac('sha512', $json, $this->secret);

        // First ingestion
        $this->postJson('/api/webhooks/paystack', $payload, [
            'x-paystack-signature' => $signature
        ])->assertStatus(200);

        // Duplicate ingestion
        $this->postJson('/api/webhooks/paystack', $payload, [
            'x-paystack-signature' => $signature
        ])->assertStatus(200)
          ->assertJson(['status' => 'duplicate ignored']);

        $this->assertEquals(1, WebhookEvent::count());
    }
}
