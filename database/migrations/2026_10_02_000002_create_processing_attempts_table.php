<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('processing_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_event_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt_number');
            $table->string('status', 24); // succeeded, failed
            $table->unsignedInteger('duration_ms');
            $table->text('error')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['webhook_event_id', 'attempt_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processing_attempts');
    }
};
