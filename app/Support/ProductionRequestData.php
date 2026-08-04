<?php

namespace App\Support;

use App\Models\DesignCartItem;

class ProductionRequestData
{
    public static function make(DesignCartItem $request, bool $detailed = false): array
    {
        $data = [
            'id' => $request->public_id,
            'status' => $request->status,
            'paymentStatus' => $request->payment_status,
            'quantity' => $request->quantity,
            'productName' => $request->product?->name ?? data_get($request->snapshot, 'product.name', 'Custom product'),
            'designName' => data_get($request->summary, 'design', 'Custom design'),
            'customer' => $request->relationLoaded('customer') ? $request->customer?->only(['name', 'email']) : null,
            'quote' => $request->quote_total !== null ? [
                'version' => $request->quote_version,
                'unitPrice' => $request->quoted_unit_price,
                'shipping' => $request->shipping_amount,
                'tax' => $request->tax_amount,
                'discount' => $request->discount_amount,
                'total' => $request->quote_total,
                'currency' => $request->currency,
                'notes' => $request->quote_notes,
                'expiresAt' => $request->quote_expires_at?->toIso8601String(),
            ] : null,
            'requestedAt' => $request->requested_at?->toIso8601String(),
            'updatedAt' => $request->updated_at?->toIso8601String(),
        ];

        if (! $detailed) {
            return $data;
        }

        return array_merge($data, [
            'summary' => $request->summary,
            'customerNote' => $request->customer_note,
            'adminNote' => $request->admin_note,
            'paymentReference' => $request->payment_reference,
            'shopifyDraftOrderName' => $request->shopify_draft_order_name,
            'shopifyInvoiceUrl' => $request->shopify_invoice_url,
            'assetsReady' => (bool) $request->assets_uploaded_at,
            'designStatus' => strtoupper((string) data_get(
                $request->snapshot,
                'design.status',
                data_get($request->snapshot, 'design.finalizedAt') ? 'FINAL' : 'DRAFT',
            )),
            'finalModelUrl' => $request->final_model_path
                ? route('admin.production-jobs.model', ['id' => $request->public_id])
                : null,
            'productionManifestUrl' => route('admin.production-jobs.show', ['id' => $request->public_id]),
            'events' => $request->events->map(fn ($event) => [
                'id' => $event->id,
                'event' => $event->event,
                'actorType' => $event->actor_type,
                'fromStatus' => $event->from_status,
                'toStatus' => $event->to_status,
                'note' => $event->note,
                'metadata' => $event->metadata,
                'createdAt' => $event->created_at?->toIso8601String(),
            ])->values(),
        ]);
    }
}
