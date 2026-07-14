<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConfiguratorProduct extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'gender',
        'category',
        'description',
        'model_path',
        'model_url',
        'model_original_name',
        'thumbnail_path',
        'thumbnail_url',
        'fit_height',
        'mesh_zones',
        'print_areas',
        'color_zones',
        'allowed_colors',
        'pattern_zones',
        'supports_colors',
        'supports_patterns',
        'supports_logos',
        'is_published',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'fit_height' => 'float',
            'mesh_zones' => 'array',
            'print_areas' => 'array',
            'color_zones' => 'array',
            'allowed_colors' => 'array',
            'pattern_zones' => 'array',
            'supports_colors' => 'boolean',
            'supports_patterns' => 'boolean',
            'supports_logos' => 'boolean',
            'is_published' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function patterns(): HasMany
    {
        return $this->hasMany(ConfiguratorPattern::class)->orderBy('sort_order')->orderBy('name');
    }
}
