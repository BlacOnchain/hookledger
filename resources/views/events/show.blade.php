<x-app-layout>
    <div class="space-y-8 max-w-4xl">
        <div class="flex items-center justify-between border-b border-border pb-4">
            <div class="space-y-1">
                <div class="text-[10px] font-bold uppercase tracking-widest text-muted">Event Detail</div>
                <h1 class="text-2xl font-bold font-mono tracking-tighter">#{{ $event->id }} · {{ $event->event_id }}</h1>
            </div>
            <div class="flex gap-3">
                <form action="{{ route('events.replay', $event) }}" method="POST">
                    @csrf
                    <button type="submit" class="bg-primary text-bg px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer">
                        Replay Event
                    </button>
                </form>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-2 space-y-6">
                <div class="space-y-2">
                    <h3 class="text-xs font-bold uppercase text-muted">Payload</h3>
                    <div class="p-4 bg-ink text-surface rounded-md font-mono text-[11px] overflow-x-auto">
                        <pre>{{ json_encode($event->payload, JSON_PRETTY_PRINT) }}</pre>
                    </div>
                </div>
            </div>
            
            <div class="space-y-6">
                <div class="p-5 border border-border bg-surface rounded-md space-y-4">
                    <h3 class="text-xs font-bold uppercase text-muted">Metadata</h3>
                    <div class="space-y-4 text-xs">
                        <div>
                            <p class="text-[10px] font-bold uppercase text-muted">Type</p>
                            <p class="font-bold">{{ $event->event_type }}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase text-muted">Reference</p>
                            <p class="font-mono">{{ $event->reference }}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase text-muted">Status</p>
                            <div class="flex items-center gap-2">
                                <span class="dot bg-{{ $event->status === 'processed' ? 'success' : 'warning' }}"></span>
                                <span class="font-bold uppercase">{{ $event->status }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <h3 class="text-xs font-bold uppercase text-muted">History</h3>
                    <div class="space-y-2">
                        @foreach($attempts as $attempt)
                            <div class="p-3 border border-border rounded-sm text-[10px] flex justify-between items-center">
                                <div>
                                    <span class="font-bold uppercase">{{ $attempt->status }}</span>
                                    <span class="text-muted ml-2">{{ $attempt->duration_ms }}ms</span>
                                </div>
                                <span class="text-muted font-mono">{{ $attempt->created_at->format('H:i:s') }}</span>
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
