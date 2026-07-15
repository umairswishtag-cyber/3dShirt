<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CustomerDesign extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'configurator_product_id',
        'product_slug',
        'product_name',
        'title',
        'status',
        'document_version',
        'document',
        'finalized_at',
        'last_opened_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (CustomerDesign $design): void {
            $design->public_id ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'document_version' => 'integer',
            'finalized_at' => 'datetime',
            'last_opened_at' => 'datetime',
        ];
    }

    protected function status(): Attribute
    {
        return Attribute::make(
            get: fn (string $value): string => strtoupper($value),
            set: fn (string $value): string => strtolower($value),
        );
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ConfiguratorProduct::class, 'configurator_product_id');
    }
}
