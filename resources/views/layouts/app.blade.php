<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'HookLedger') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Schibsted+Grotesk:wght@400;700&display=swap" rel="stylesheet">

    <!-- Scripts -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-bg text-ink font-sans antialiased">
    <div class="min-h-screen flex flex-col">
        <!-- Navigation -->
        <header class="border-b border-border py-4 px-6 flex items-center justify-between">
            <div class="flex items-center gap-8">
                <a href="/" class="text-lg font-bold tracking-tight">HookLedger</a>
                <nav class="hidden md:flex items-center gap-6 text-sm font-medium">
                    <a href="{{ route('events.index') }}" class="hover:text-primary">Events</a>
                    <a href="{{ route('dead-letters.index') }}" class="hover:text-primary">Dead Letters</a>
                    <a href="{{ route('reconciliation.index') }}" class="hover:text-primary">Reconciliation</a>
                </nav>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-[10px] font-mono text-muted uppercase">User: {{ auth()->user()->email }}</span>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 p-6 max-w-7xl mx-auto w-full">
            {{ $slot }}
        </main>

        <!-- Footer -->
        <footer class="border-t border-border py-4 px-6 text-[10px] text-muted text-center uppercase tracking-widest">
            &copy; {{ date('Y') }} HookLedger Engine · All Rights Reserved
        </footer>
    </div>
</body>
</html>
