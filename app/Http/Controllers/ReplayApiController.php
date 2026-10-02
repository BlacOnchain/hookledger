<?php

namespace App\Http\Controllers;

use App\Models\WebhookEvent;
use App\Jobs\ProcessWebhookJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ReplayApiController extends Controller
{
    public function __invoke(Request $request)
    {
        $token = $request->bearerToken();
        $expected = config('hookledger.replay_token');

        if (!$token || !hash_equals($expected, $token)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'event_id' => 'required|exists:webhook_events,id'
        ]);

        $event = WebhookEvent::findOrFail($request->event_id);
        $event->update(['status' => 'received']);
        ProcessWebhookJob::dispatch($event->id)->onQueue('webhooks');

        return response()->json(['status' => 're-queued']);
    }
}
