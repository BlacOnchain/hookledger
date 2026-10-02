<?php

namespace App\Http\Controllers;

use App\Models\WebhookEvent;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = WebhookEvent::latest()->paginate(25);
        return view('events.index', compact('events'));
    }

    public function show(WebhookEvent $event)
    {
        $attempts = \App\Models\ProcessingAttempt::where('webhook_event_id', $event->id)->latest()->get();
        return view('events.show', compact('event', 'attempts'));
    }
}
