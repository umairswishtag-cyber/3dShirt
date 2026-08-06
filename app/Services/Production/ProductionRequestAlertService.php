<?php

namespace App\Services\Production;

use App\Models\Customer;
use App\Models\DesignCartItem;
use App\Models\ProductionRequestEvent;
use App\Models\ProductionRequestEventRead;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class ProductionRequestAlertService
{
    /** @return array{unreadCount: int} */
    public function summary(?Model $reader): array
    {
        return ['unreadCount' => $reader ? $this->unreadQuery($reader)->count() : 0];
    }

    /**
     * @param  Collection<int, int>|array<int, int>  $requestIds
     * @return Collection<int, int>
     */
    public function countsByRequest(Model $reader, Collection|array $requestIds): Collection
    {
        $ids = collect($requestIds)->map(fn ($id) => (int) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        return $this->unreadQuery($reader)
            ->whereIn('design_cart_item_id', $ids)
            ->selectRaw('design_cart_item_id, COUNT(*) as unread_count')
            ->groupBy('design_cart_item_id')
            ->pluck('unread_count', 'design_cart_item_id')
            ->map(fn ($count) => (int) $count);
    }

    public function markRead(DesignCartItem $request, Model $reader): void
    {
        $lastEventId = $request->events()->where('creates_alert', true)->max('id');
        if (! $lastEventId) {
            return;
        }

        [$readerType, $readerId] = $this->identity($reader);
        ProductionRequestEventRead::query()->updateOrCreate([
            'design_cart_item_id' => $request->id,
            'reader_type' => $readerType,
            'reader_id' => $readerId,
        ], [
            'last_read_event_id' => $lastEventId,
        ]);
    }

    private function unreadQuery(Model $reader): Builder
    {
        [$readerType, $readerId] = $this->identity($reader);

        return ProductionRequestEvent::query()
            ->where('creates_alert', true)
            ->whereHas('request', fn (Builder $query) => $this->scopeRequests($query, $reader))
            ->where(function (Builder $query) use ($readerType, $readerId): void {
                $query->where('actor_type', '!=', $readerType)
                    ->orWhereNull('actor_id')
                    ->orWhere('actor_id', '!=', $readerId);
            })
            ->whereNotExists(function ($query) use ($readerType, $readerId): void {
                $query->selectRaw('1')
                    ->from('production_request_event_reads as event_reads')
                    ->whereColumn('event_reads.design_cart_item_id', 'production_request_events.design_cart_item_id')
                    ->where('event_reads.reader_type', $readerType)
                    ->where('event_reads.reader_id', $readerId)
                    ->whereColumn('event_reads.last_read_event_id', '>=', 'production_request_events.id');
            });
    }

    private function scopeRequests(Builder $query, Model $reader): void
    {
        if ($reader instanceof Customer) {
            $query->where('customer_id', $reader->id);

            return;
        }

        if ($reader instanceof User && ! $reader->isPlatformAdmin()) {
            $query->whereHas(
                'customer',
                fn (Builder $customers) => $customers->where('user_id', $reader->id),
            );
        }
    }

    /** @return array{string, int} */
    private function identity(Model $reader): array
    {
        return [
            $reader instanceof Customer ? 'customer' : 'admin',
            (int) $reader->getKey(),
        ];
    }
}
