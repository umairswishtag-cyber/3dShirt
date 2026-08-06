<?php

namespace App\Services\Production;

use App\Models\DesignCartItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionRequestWorkflow
{
    public const STATUSES = [
        'prepared', 'submitted', 'under_review', 'changes_requested', 'rejected',
        'quoted', 'quote_approved', 'payment_pending', 'paid', 'proof_review',
        'ready_for_print', 'printing', 'completed', 'cancelled', 'ordered',
    ];

    private const TRANSITIONS = [
        'prepared' => ['submitted', 'cancelled'],
        'submitted' => ['under_review', 'changes_requested', 'rejected', 'cancelled'],
        'under_review' => ['quoted', 'changes_requested', 'rejected', 'cancelled'],
        'changes_requested' => ['submitted', 'under_review', 'quoted', 'quote_approved', 'ready_for_print', 'cancelled'],
        'quoted' => ['quoted', 'quote_approved', 'changes_requested', 'rejected', 'cancelled'],
        'quote_approved' => ['payment_pending', 'paid', 'cancelled'],
        'payment_pending' => ['paid', 'cancelled'],
        'paid' => ['proof_review', 'ready_for_print', 'cancelled'],
        'proof_review' => ['ready_for_print', 'changes_requested', 'cancelled'],
        'ready_for_print' => ['printing', 'cancelled'],
        'printing' => ['completed'],
        'ordered' => ['paid', 'ready_for_print'],
    ];

    public function submit(DesignCartItem $request, ?Model $actor = null): DesignCartItem
    {
        return $this->transition($request, 'submitted', 'request_submitted', $actor, null, [
            'requested_at' => now(),
        ]);
    }

    /** @param array<string, mixed> $quote */
    public function quote(DesignCartItem $request, array $quote, Model $actor): DesignCartItem
    {
        $total = ((float) $quote['unit_price'] * $request->quantity)
            + (float) ($quote['shipping'] ?? 0)
            + (float) ($quote['tax'] ?? 0)
            - (float) ($quote['discount'] ?? 0);

        return $this->transition($request, 'quoted', 'quote_sent', $actor, $quote['notes'] ?? null, [
            'quote_version' => $request->quote_version + 1,
            'quoted_unit_price' => $quote['unit_price'],
            'shipping_amount' => $quote['shipping'] ?? 0,
            'tax_amount' => $quote['tax'] ?? 0,
            'discount_amount' => $quote['discount'] ?? 0,
            'quote_total' => max(0, $total),
            'currency' => strtoupper($quote['currency']),
            'quote_notes' => $quote['notes'] ?? null,
            'quote_expires_at' => $quote['expires_at'] ?? null,
            'quoted_at' => now(),
            'reviewed_at' => $request->reviewed_at ?? now(),
            'payment_status' => 'not_requested',
        ]);
    }

    /** @param array<string, mixed> $attributes */
    public function transition(
        DesignCartItem $request,
        string $to,
        string $event,
        ?Model $actor = null,
        ?string $note = null,
        array $attributes = [],
    ): DesignCartItem {
        $from = $request->status;
        if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "A request cannot move from {$from} to {$to}.",
            ]);
        }

        return DB::transaction(function () use ($request, $from, $to, $event, $actor, $note, $attributes) {
            $request->update(array_merge($attributes, ['status' => $to]));
            $request->events()->create([
                'actor_type' => $this->actorType($actor),
                'actor_id' => $actor?->getKey(),
                'event' => $event,
                'from_status' => $from,
                'to_status' => $to,
                'note' => $note,
                'metadata' => $this->eventMetadata($request, $event),
                'creates_alert' => $actor !== null,
            ]);

            return $request->refresh();
        });
    }

    public function record(DesignCartItem $request, string $event, ?Model $actor = null, ?string $note = null, array $metadata = [], bool $createsAlert = false): void
    {
        $request->events()->create([
            'actor_type' => $this->actorType($actor),
            'actor_id' => $actor?->getKey(),
            'event' => $event,
            'from_status' => $request->status,
            'to_status' => $request->status,
            'note' => $note,
            'metadata' => $metadata ?: null,
            'creates_alert' => $createsAlert && $actor !== null,
        ]);
    }

    private function actorType(?Model $actor): string
    {
        if (! $actor) {
            return 'system';
        }

        return class_basename($actor) === 'Customer' ? 'customer' : 'admin';
    }

    private function eventMetadata(DesignCartItem $request, string $event): ?array
    {
        if ($event !== 'quote_sent') {
            return null;
        }

        return [
            'version' => $request->quote_version,
            'total' => $request->quote_total,
            'currency' => $request->currency,
        ];
    }
}
