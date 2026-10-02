<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HookLedger</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Schibsted+Grotesk:wght@400;700&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="bg-bg text-ink">
    <div class="min-h-screen flex flex-col">
        <header class="border-b border-border py-4 px-6 flex items-center justify-between">
            <div class="flex items-center gap-8">
                <a href="/" class="flex items-center gap-2">
                    <img src="/favicon.svg" class="w-8 h-8" alt="HookLedger">
                    <span class="text-lg font-bold tracking-tight uppercase">HookLedger</span>
                </a>
                <nav class="hidden md:flex items-center gap-6 text-sm font-bold uppercase">
                    <a href="{{ route('dashboard') }}" class="hover:text-primary">Dashboard</a>
                    <a href="{{ route('events.index') }}" class="hover:text-primary">Events</a>
                    <a href="{{ route('dead-letters.index') }}" class="hover:text-primary">Dead Letters</a>
                </nav>
            </div>
            <div>
                @auth
                    <form method="POST" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" class="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink cursor-pointer">Logout</button>
                    </form>
                @endauth
            </div>
        </header>

        <main class="flex-1 p-6 max-w-7xl mx-auto w-full">
            {{ $slot }}
        </main>

        <footer class="border-t border-border py-4 px-6 text-[10px] text-muted text-center uppercase tracking-widest">
            &copy; {{ date('Y') }} HookLedger Engine · Infrastructure as Code
        </footer>
    </div>
</body>
</html>
