<?php

use App\Jobs\OrderSyncJob;
use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::call(function (): void {
    User::query()
        ->where('name', 'like', '%.myshopify.com')
        ->pluck('id')
        ->each(fn (int $userId) => OrderSyncJob::dispatch($userId));
})->name('sync-shopify-orders')->everyFiveMinutes()->withoutOverlapping();
