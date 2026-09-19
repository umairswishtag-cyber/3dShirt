<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Orders\Order;
use app\Models\Products\Product;
use Osiset\ShopifyApp\Traits\ShopModel;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Osiset\ShopifyApp\Contracts\ShopModel as IShopModel;
use Osiset\ShopifyApp\Contracts\ApiHelper as IApiHelper;
use App\Services\Shopify\ShopifyTokenManager;

class User extends Authenticatable implements IShopModel
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;
    use ShopModel { apiHelper as private packageApiHelper; }
    use SoftDeletes;

    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            $name = strtolower(trim((string) $user->name));
            if (! $user->is_platform_admin && str_ends_with($name, '.myshopify.com')) {
                $user->storefront_key = $name;
            }
        });

        static::creating(function (User $user): void {
            if ($user->storefront_key || $user->is_platform_admin) {
                return;
            }

            $name = strtolower(trim((string) $user->name));
            $user->storefront_key = str_ends_with($name, '.myshopify.com')
                ? $name
                : (Str::slug($name) ?: 'store').'-'.Str::lower(Str::random(8));
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'shopify_refresh_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_platform_admin' => 'boolean',
            'shopify_refresh_token' => 'encrypted',
            'shopify_token_expires_at' => 'datetime',
            'shopify_refresh_token_expires_at' => 'datetime',
        ];
    }

    public function apiHelper(): IApiHelper
    {
        app(ShopifyTokenManager::class)->refreshIfNeeded($this);

        return $this->packageApiHelper();
    }

    public function chatbotSetting(): HasOne
    {
        return $this->hasOne(ChatbotSetting::class);
    }

    public function configuratorProducts(): HasMany
    {
        return $this->hasMany(ConfiguratorProduct::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function productionRequests(): HasMany
    {
        return $this->hasManyThrough(DesignCartItem::class, Customer::class);
    }

    public function isPlatformAdmin(): bool
    {
        if ($this->is_platform_admin) {
            return true;
        }

        return in_array(
            strtolower($this->email),
            config('chatbot.platform_admin_emails', []),
            true,
        );
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
