<x-app-layout>
    <div class="space-y-8">
        <h1 class="text-xl font-bold tracking-tight">Dead Letter Queue</h1>

        <div class="border border-border bg-surface rounded-md overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-bg/30 border-b border-border">
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Event ID</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted">Reason</th>
                        <th class="py-3 px-4 font-bold uppercase tracking-wider text-muted text-right">Failed At</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    @forelse($letters as $letter)
                        <tr class="hover:bg-bg/10">
                            <td class="py-3 px-4 font-mono">
                                <a href="{{ route('events.show', $letter->webhook_event_id) }}" class="hover:text-primary">{{ $letter->event_id }}</a>
                            </td>
                            <td class="py-3 px-4 text-danger">{{ $letter->reason }}</td>
                            <td class="py-3 px-4 text-right text-muted">{{ $letter->failed_at->format('Y-m-d H:i:s') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" class="py-12 text-center text-muted italic">No dead letters found.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        <div>
            {{ $letters->links() }}
        </div>
    </div>
</x-app-layout>
