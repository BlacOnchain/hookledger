<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SimulatorCommand extends Command
{
    protected $signature = 'hookledger:simulate {type : valid|duplicate|malformed|unsigned|bad_signature}';
    protected $description = 'Simulate various webhook scenarios';

    public function handle(): int
    {
        $type = $this->argument('type');
        $url = url('/api/webhooks/paystack');
        $secret = config('hookledger.paystack.secret_key');
        
        $payload = [
            'event' => 'charge.success',
            'data' => [
                'id' => 'sim_' . time(),
                'reference' => 'REF_' . time(),
                'amount' => 500000,
                'currency' => 'NGN',
                'customer' => ['email' => 'sim@example.com']
            ]
        ];

        switch ($type) {
            case 'valid':
                $this->send($url, $payload, $secret);
                break;
            case 'duplicate':
                $payload['data']['id'] = 'dup_123';
                $this->send($url, $payload, $secret);
                $this->send($url, $payload, $secret);
                break;
            case 'unsigned':
                $this->send($url, $payload, null);
                break;
            case 'bad_signature':
                $this->send($url, $payload, 'wrong_secret');
                break;
            case 'malformed':
                Http::withHeaders(['Content-Type' => 'application/json'])
                    ->send('POST', $url, ['body' => 'not json'])
                    ->body();
                $this->info("Sent malformed request.");
                break;
        }

        return self::SUCCESS;
    }

    protected function send($url, $payload, $secret): void
    {
        $json = json_encode($payload);
        $signature = $secret ? hash_hmac('sha512', $json, $secret) : '';
        
        $response = Http::withHeaders(['x-paystack-signature' => $signature])
            ->post($url, $payload);
            
        $this->info("Sent {$payload['data']['id']} -> Status: " . $response->status() . " Body: " . $response->body());
    }
}
