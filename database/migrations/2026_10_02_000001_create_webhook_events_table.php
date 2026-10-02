<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 32);
            $table->string('event_id', 128);
            $table->string('event_type', 64);
            $table->string('reference', 128)->index();
            $table->json('payload');
            $table->longText('raw_payload');
            $table->string('status', 24)->default('pending');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            // UNIQUE constraint for idempotency
            $table->unique(['provider', 'event_id']);
            $table->index(['status', 'next_retry_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
    }
};
