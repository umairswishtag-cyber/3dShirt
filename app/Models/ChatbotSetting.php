<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotSetting extends Model
{
    public const POSITIONS = [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
    ];

    protected $fillable = [
        'user_id',
        'is_enabled',
        'position',
        'requested_at',
        'reviewed_at',
        'activated_at',
        'activated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'requested_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'activated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    /** @return array{enabled: true, position: string}|array{enabled: false} */
    public function storefrontConfig(): array
    {
        if (! $this->is_enabled) {
            return ['enabled' => false];
        }

        return [
            'enabled' => true,
            'position' => in_array($this->position, self::POSITIONS, true)
                ? $this->position
                : 'bottom-right',
        ];
    }
}
