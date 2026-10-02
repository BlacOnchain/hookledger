<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dead_letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_event_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider', 32);
            $table->string('event_id', 128);
            $table->text('reason');
            $table->timestamp('failed_at')->useCurrent();
            $table->timestamp('replayed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dead_letters');
    }
};
