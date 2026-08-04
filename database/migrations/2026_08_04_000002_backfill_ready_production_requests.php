<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('design_cart_items')
            ->where('status', 'ready')
            ->orderBy('id')
            ->get(['id', 'assets_uploaded_at', 'created_at'])
            ->each(function ($item): void {
                $requestedAt = $item->assets_uploaded_at ?? $item->created_at ?? now();
                DB::table('design_cart_items')->where('id', $item->id)->update([
                    'status' => 'submitted',
                    'requested_at' => $requestedAt,
                    'updated_at' => now(),
                ]);
                DB::table('production_request_events')->insert([
                    'design_cart_item_id' => $item->id,
                    'actor_type' => 'system',
                    'event' => 'legacy_request_imported',
                    'from_status' => 'ready',
                    'to_status' => 'submitted',
                    'note' => 'Imported from the previous Shopify-cart production flow.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        $ids = DB::table('production_request_events')
            ->where('event', 'legacy_request_imported')
            ->pluck('design_cart_item_id');
        DB::table('design_cart_items')->whereIn('id', $ids)->where('status', 'submitted')->update([
            'status' => 'ready',
            'requested_at' => null,
            'updated_at' => now(),
        ]);
        DB::table('production_request_events')->where('event', 'legacy_request_imported')->delete();
    }
};
