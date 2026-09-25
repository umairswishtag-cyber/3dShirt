<?php

namespace Tests\Feature;

use App\Jobs\OrderSyncJob;
use App\Models\User;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class OrderSyncJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_one_order_sync_can_wait_for_a_user_indefinitely(): void
    {
        config()->set('queue.default', 'order-sync-test');
        config()->set('queue.connections.order-sync-test', [
            'driver' => 'database',
            'connection' => 'sqlite',
            'table' => 'jobs',
            'queue' => 'default',
            'retry_after' => 90,
            'after_commit' => false,
        ]);

        $user = User::factory()->create();

        OrderSyncJob::dispatch($user->id);
        $this->travel(5)->minutes();
        OrderSyncJob::dispatch($user->id);

        $this->assertSame(1, DB::table('jobs')->count());
    }

    public function test_loading_the_dashboard_does_not_dispatch_an_order_sync(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->get('/dashboard')->assertOk();

        Queue::assertNothingPushed();
    }

    public function test_scheduler_skips_stores_with_known_restricted_order_access(): void
    {
        Queue::fake();
        $restricted = User::factory()->create(['name' => 'restricted.myshopify.com']);
        $eligible = User::factory()->create(['name' => 'eligible.myshopify.com']);
        Cache::put("shopify:orders-access-restricted:{$restricted->id}", true, now()->addDay());

        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => $event->description === 'sync-shopify-orders');

        $this->assertNotNull($event);
        $event->run(app());

        Queue::assertNotPushed(
            OrderSyncJob::class,
            fn (OrderSyncJob $job) => $job->uniqueId() === (string) $restricted->id,
        );
        Queue::assertPushed(
            OrderSyncJob::class,
            fn (OrderSyncJob $job) => $job->uniqueId() === (string) $eligible->id,
        );
    }
}
