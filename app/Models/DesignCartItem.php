<?php

namespace App\Models;

use App\Models\Orders\OrderLineItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DesignCartItem extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_design_id',
        'configurator_product_id',
        'shopify_product_id',
        'shopify_variant_id',
        'quantity',
        'status',
        'payment_status',
        'quote_version',
        'quoted_unit_price',
        'shipping_amount',
        'tax_amount',
        'discount_amount',
        'quote_total',
        'currency',
        'quote_notes',
        'quote_expires_at',
        'quoted_at',
        'requested_at',
        'reviewed_at',
        'customer_responded_at',
        'payment_cleared_at',
        'print_started_at',
        'completed_at',
        'customer_note',
        'admin_note',
        'payment_reference',
        'shopify_draft_order_id',
        'shopify_draft_order_name',
        'shopify_invoice_url',
        'shopify_invoice_sent_at',
        'shopify_order_id',
        'snapshot_sha256',
        'snapshot',
        'summary',
        'final_model_path',
        'print_area_paths',
        'logo_paths',
        'pattern_path',
        'assets_uploaded_at',
        'ordered_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (DesignCartItem $item): void {
            $item->public_id ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'shopify_product_id' => 'integer',
            'shopify_variant_id' => 'integer',
            'quantity' => 'integer',
            'quote_version' => 'integer',
            'quoted_unit_price' => 'decimal:2',
            'shipping_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'quote_total' => 'decimal:2',
            'snapshot' => 'array',
            'summary' => 'array',
            'print_area_paths' => 'array',
            'logo_paths' => 'array',
            'assets_uploaded_at' => 'datetime',
            'ordered_at' => 'datetime',
            'quote_expires_at' => 'datetime',
            'quoted_at' => 'datetime',
            'requested_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'customer_responded_at' => 'datetime',
            'payment_cleared_at' => 'datetime',
            'print_started_at' => 'datetime',
            'completed_at' => 'datetime',
            'shopify_invoice_sent_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function design(): BelongsTo
    {
        return $this->belongsTo(CustomerDesign::class, 'customer_design_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ConfiguratorProduct::class, 'configurator_product_id');
    }

    public function orderLineItems(): HasMany
    {
        return $this->hasMany(OrderLineItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ProductionRequestEvent::class)->oldest();
    }
}
