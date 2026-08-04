<?php

namespace App\Jobs;

use App\Http\Traits\ResponseTrait;
use App\Http\Traits\ShopifyOrderTrait;
use App\Models\User;
use App\Repositories\Order\OrderRepositoryInterface;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class OrderSyncJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable, ResponseTrait, ShopifyOrderTrait;

    /**
     * Create a new job instance.
     */
    protected $userId;

    public int $uniqueFor = 240;

    public function __construct($userId)
    {
        $this->userId = $userId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->getOrderRepository(app(OrderRepositoryInterface::class));
        $user = User::find($this->userId);
        if ($this->getOrdersFromShopify($user)) {
            $this->logInfo('Orders Synced successfully from Shopify for user ID: '.$this->userId);
        } else {
            $this->logInfo('Orders Synced failed from Shopify for user ID: '.$this->userId);
        }
    }

    public function uniqueId(): string
    {
        return (string) $this->userId;
    }
}
