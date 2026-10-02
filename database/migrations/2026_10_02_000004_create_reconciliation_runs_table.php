<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliation_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('checked_count')->default(0);
            $table->unsignedInteger('repaired_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->json('errors')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliation_runs');
    }
};
