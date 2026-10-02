<?php

/**
 * HookLedger Webhook Chaos Simulator
 * Sends variations of webhooks to test engine resilience.
 */

$url = 'http://localhost/api/webhooks/paystack'; // Target endpoint
$secret = 'sk_test_mock_secret';

function send_webhook($url, $payload, $secret, $headers = []) {
    $json = json_encode($payload);
    $signature = hash_hmac('sha512', $json, $secret);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    $default_headers = [
        'Content-Type: application/json',
        "x-paystack-signature: $signature"
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($default_headers, $headers));
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [$status, $response];
}

// 1. Duplicate Webhook
echo "Sending duplicate webhooks...\n";
$payload = ['id' => 'sim_1', 'reference' => 'ref_1', 'event' => 'charge.success', 'data' => []];
send_webhook($url, $payload, $secret);
[$status, $res] = send_webhook($url, $payload, $secret);
echo "Duplicate Status: $status\n";

// 2. Malformed Webhook (Missing Signature)
echo "Sending malformed webhook...\n";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POSTFIELDS, "not json");
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_exec($ch);
echo "Malformed sent.\n";

// 3. Out-of-order (Logic-dependent, usually simulated by timing)
echo "Chaos simulation finished.\n";
