<x-app-layout>
    <div class="space-y-8">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold tracking-tight">Events</h1>
            <div class="flex gap-4">
                <input type="text" placeholder="Search reference..." class="bg-surface border border-border px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-primary w-64">
            </div>
        </div>

        <div class="border border-border bg-surface rounded-md overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-bg/30 border-b border-border">
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">ID</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Type</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Reference</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Status</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted text-right">Received</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    @forelse($events as $event)
                        <tr class="hover:bg-bg/10">
                            <td class="py-3 px-4 font-mono text-muted">#{{ $event->id }}</td>
                            <td class="py-3 px-4 font-bold">
                                <a href="{{ route('events.show', $event) }}" class="hover:text-primary transition-colors">{{ $event->event_type }}</a>
                            </td>
                            <td class="py-3 px-4 font-mono">{{ $event->reference }}</td>
                            <td class="py-3 px-4">
                                <span class="dot bg-{{ 
                                    $event->status === 'processed' ? 'success' : 
                                    ($event->status === 'failed' ? 'danger' : 'warning') 
                                }}"></span>
                                <span class="text-[10px] font-bold uppercase tracking-tight">{{ $event->status }}</span>
                            </td>
                            <td class="py-3 px-4 text-right text-muted tabular-nums">{{ $event->received_at->format('Y-m-d H:i:s') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="py-12 text-center text-muted italic">No events found in inbox.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        <div>
            {{ $events->links() }}
        </div>
    </div>
</x-app-layout>
