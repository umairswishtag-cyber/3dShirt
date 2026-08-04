<?php

namespace App\Models\Orders;

use App\Models\DesignCartItem;
use App\Models\Products\ProductVarient;
use Illuminate\Database\Eloquent\Model;

class OrderLineItem extends Model
{
    protected $fillable = [
        'shopify_order_lineitem_id',
        'order_id',
        'design_cart_item_id',
        'price',
        'quantity',
        'sku',
        'title',
        'total_discount',
        'shopify_product_variant_id',
        'customization_properties',
    ];

    protected function casts(): array
    {
        return [
            'customization_properties' => 'array',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function productVariant()
    {
        return $this->belongsTo(ProductVarient::class, 'shopify_product_variant_id', 'shopify_product_variant_id');
    }

    public function designCartItem()
    {
        return $this->belongsTo(DesignCartItem::class);
    }
}
