<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConfiguratorPattern extends Model
{
    protected $fillable = [
        'configurator_product_id',
        'name',
        'slug',
        'svg_path',
        'svg_url',
        'svg_original_name',
        'color_slots',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'color_slots' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ConfiguratorProduct::class, 'configurator_product_id');
    }
}
