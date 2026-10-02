<?php

namespace App\Http\Controllers;

use App\Models\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class PaystackWebhookController extends Controller
{
    public function __invoke(Request $request)
    {
        $payload = $request->json()->all();
        
        // Requirements specify provider and event_id must be unique.
        // We use insertOrIgnore to handle duplicates gracefully without failing.
        try {
            $event = WebhookEvent::create([
                'provider' => 'paystack',
                'event_id' => (string) ($payload['event_id'] ?? $payload['data']['id'] ?? ''),
                'event_type' => $request->json('event'),
                'reference' => $request->json('data.reference'),
                'payload' => $payload,
                'signature' => $request->header('x-paystack-signature'),
                'status' => 'received',
                'received_at' => now(),
            ]);

            \App\Jobs\ProcessWebhookJob::dispatch($event->id)->onQueue('webhooks');
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // Requirement: Always return 200 for duplicates
            return response()->json(['status' => 'duplicate ignored'], 200);
        } catch (Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }

        return response()->json(['status' => 'accepted', 'id' => $event->id], 200);
    }
}
