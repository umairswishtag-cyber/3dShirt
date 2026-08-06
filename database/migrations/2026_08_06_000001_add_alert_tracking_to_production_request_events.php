<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_request_events', function (Blueprint $table): void {
            $table->boolean('creates_alert')->default(false)->index()->after('metadata');
        });

        Schema::create('production_request_event_reads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('design_cart_item_id')->constrained()->cascadeOnDelete();
            $table->string('reader_type', 16);
            $table->unsignedBigInteger('reader_id');
            $table->foreignId('last_read_event_id')
                ->nullable()
                ->constrained('production_request_events')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['design_cart_item_id', 'reader_type', 'reader_id'],
                'production_event_reads_reader_unique',
            );
            $table->index(['reader_type', 'reader_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_request_event_reads');

        Schema::table('production_request_events', function (Blueprint $table): void {
            $table->dropColumn('creates_alert');
        });
    }
};
