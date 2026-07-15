<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ConfiguratorTaxonomy extends Model
{
    public const TYPE_AUDIENCE = 'audience';

    public const TYPE_CATEGORY = 'category';

    protected $fillable = ['type', 'slug', 'label', 'sort_order'];

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }
}
