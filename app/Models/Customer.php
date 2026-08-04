<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class Customer extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'password',
        'auth_provider',
        'provider_subject',
        'shopify_customer_gid',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected static function booted(): void
    {
        static::creating(function (Customer $customer): void {
            $customer->public_id ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function designs(): HasMany
    {
        return $this->hasMany(CustomerDesign::class);
    }

    public function productionRequests(): HasMany
    {
        return $this->hasMany(DesignCartItem::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
