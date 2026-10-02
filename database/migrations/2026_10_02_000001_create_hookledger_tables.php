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
            $table->string('reference', 128)->nullable()->index();
            $table->json('payload');
            $table->text('signature')->nullable();
            $table->string('status', 24)->default('received'); // received, processing, processed, failed
            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'event_id']);
        });

        Schema::create('processing_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_event_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt_number');
            $table->string('status', 24);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('dead_letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_event_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider', 32);
            $table->string('event_id', 128);
            $table->text('reason')->nullable();
            $table->timestamp('failed_at')->useCurrent();
            $table->timestamp('replayed_at')->nullable();
        });

        Schema::create('reconciliation_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('checked_count')->default(0);
            $table->unsignedInteger('repaired_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->json('logs')->nullable();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('finished_at')->nullable();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 128)->unique();
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 3);
            $table->string('status', 24);
            $table->string('customer_email', 191)->index();
            $table->foreignId('webhook_event_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('reconciliation_runs');
        Schema::dropIfExists('dead_letters');
        Schema::dropIfExists('processing_attempts');
        Schema::dropIfExists('webhook_events');
    }
};
