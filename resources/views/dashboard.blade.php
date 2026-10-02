<x-app-layout>
    <div class="space-y-8">
        <h1 class="text-xl font-bold tracking-tight uppercase">Dashboard</h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="p-6 border border-border bg-surface rounded-md">
                <p class="text-[10px] font-bold uppercase text-muted tracking-widest">Total Events</p>
                <p class="text-3xl font-bold font-mono tracking-tighter mt-1">{{ \App\Models\WebhookEvent::count() }}</p>
            </div>
            <div class="p-6 border border-border bg-surface rounded-md">
                <p class="text-[10px] font-bold uppercase text-muted tracking-widest">Dead Letters</p>
                <p class="text-3xl font-bold font-mono tracking-tighter mt-1 text-danger">{{ \App\Models\DeadLetter::whereNull('replayed_at')->count() }}</p>
            </div>
            <div class="p-6 border border-border bg-surface rounded-md">
                <p class="text-[10px] font-bold uppercase text-muted tracking-widest">Success Rate</p>
                @php
                    $total = \App\Models\WebhookEvent::count();
                    $processed = \App\Models\WebhookEvent::where('status', 'processed')->count();
                    $rate = $total > 0 ? round(($processed / $total) * 100, 1) : 100;
                @endphp
                <p class="text-3xl font-bold font-mono tracking-tighter mt-1">{{ $rate }}%</p>
            </div>
        </div>

        <div class="space-y-4">
            <h2 class="text-sm font-bold uppercase text-muted tracking-widest">Recent Activity</h2>
            <div class="border border-border bg-surface rounded-md overflow-hidden">
                 <table class="w-full text-left border-collapse text-xs">
                    <tbody class="divide-y divide-border">
                        @foreach(\App\Models\WebhookEvent::latest()->take(10)->get() as $event)
                            <tr class="hover:bg-bg/10">
                                <td class="py-3 px-4 font-mono text-muted">#{{ $event->id }}</td>
                                <td class="py-3 px-4 font-bold">{{ $event->event_type }}</td>
                                <td class="py-3 px-4">
                                    <span class="dot bg-{{ $event->status === 'processed' ? 'success' : 'warning' }}"></span>
                                    <span class="text-[10px] font-bold uppercase">{{ $event->status }}</span>
                                </td>
                                <td class="py-3 px-4 text-right text-muted">{{ $event->received_at->diffForHumans() }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                 </table>
            </div>
        </div>
    </div>
</x-app-layout>
