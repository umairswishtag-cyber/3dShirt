<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionRequestEventRead extends Model
{
    protected $fillable = [
        'design_cart_item_id',
        'reader_type',
        'reader_id',
        'last_read_event_id',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(DesignCartItem::class, 'design_cart_item_id');
    }

    public function lastReadEvent(): BelongsTo
    {
        return $this->belongsTo(ProductionRequestEvent::class, 'last_read_event_id');
    }
}
