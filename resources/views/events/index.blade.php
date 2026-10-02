<x-app-layout>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold tracking-tight text-ink">Events</h1>
            <div class="flex gap-2">
                <input type="text" placeholder="Search reference..." class="px-3 py-1.5 text-xs bg-surface border border-border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary w-64">
            </div>
        </div>

        <div class="border border-border bg-surface rounded-[6px] overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-bg/50 border-b border-border">
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Received</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">ID</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Type</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Reference</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Status</th>
                        <th class="py-3 px-4"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    @forelse($events as $event)
                    <tr class="hover:bg-bg/20 transition-colors">
                        <td class="py-3 px-4 font-mono text-muted">{{ $event->created_at->format('H:i:s') }}</td>
                        <td class="py-3 px-4 font-mono">{{ $event->event_id }}</td>
                        <td class="py-3 px-4">{{ $event->event_type }}</td>
                        <td class="py-3 px-4 font-mono">{{ $event->reference }}</td>
                        <td class="py-3 px-4 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-{{ $event->status === 'processed' ? 'success' : ($event->status === 'failed' ? 'danger' : 'warning') }}"></span>
                            <span class="capitalize">{{ $event->status }}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                            <a href="{{ route('events.show', $event) }}" class="text-[10px] font-bold uppercase hover:text-primary">View</a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="py-12 text-center text-muted italic">No events found.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        <div class="py-4">
            {{ $events->links() }}
        </div>
    </div>
</x-app-layout>
