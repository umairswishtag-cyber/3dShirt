<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionRequestEvent extends Model
{
    protected $fillable = [
        'design_cart_item_id', 'actor_type', 'actor_id', 'event',
        'from_status', 'to_status', 'note', 'metadata',
    ];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(DesignCartItem::class, 'design_cart_item_id');
    }
}
