<?php

namespace App\Http\Controllers;

use App\Models\DesignCartItem;
use App\Services\Production\ProductionRequestAlertService;
use App\Services\Production\ProductionRequestWorkflow;
use App\Services\Storefront\StorefrontContext;
use App\Support\ProductionRequestData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CustomerProductionRequestController extends Controller
{
    public function __construct(
        private readonly ProductionRequestWorkflow $workflow,
        private readonly StorefrontContext $storefront,
        private readonly ProductionRequestAlertService $alerts,
    ) {}

    public function show(Request $request, string $store, string $id): Response
    {
        $item = $this->find($request, $id);
        $this->alerts->markRead($item, auth('customer')->user());

        return Inertia::render('Customer/Requests/Show', [
            'productionRequest' => ProductionRequestData::make($item, true),
            'storefront' => $this->storefront->links($this->storefront->require($request)),
        ]);
    }

    public function message(Request $request, string $store, string $id): RedirectResponse
    {
        $item = $this->find($request, $id);
        $data = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);
        $customer = auth('customer')->user();
        $this->workflow->record(
            $item,
            'message_sent',
            $customer,
            trim($data['message']),
            createsAlert: true,
        );
        $this->alerts->markRead($item, $customer);

        return back()->with('success', 'Message sent.');
    }

    public function respond(Request $request, string $store, string $id): RedirectResponse
    {
        $item = $this->find($request, $id);
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve_quote', 'approve_proof', 'request_changes', 'decline'])],
            'note' => [Rule::requiredIf(fn () => $request->input('action') === 'request_changes'), 'nullable', 'string', 'max:3000'],
        ]);

        if ($data['action'] === 'request_changes') {
            $awaitsProofDecision = $this->awaitsProofDecision($item);
            if (! $this->awaitsQuoteDecision($item) && ! $awaitsProofDecision) {
                throw ValidationException::withMessages([
                    'action' => 'A revision can only be requested while a quotation or proof is awaiting your decision.',
                ]);
            }

            $item->update([
                'customer_responded_at' => now(),
                'customer_note' => $data['note'],
            ]);
            $this->workflow->record(
                $item,
                'customer_changes_requested',
                auth('customer')->user(),
                $data['note'],
                createsAlert: true,
            );

            return back()->with(
                'success',
                $awaitsProofDecision
                    ? 'Revision request sent. The proof remains available until you approve it.'
                    : 'Revision request sent. The quotation remains available until you approve or decline it.',
            );
        }

        if ($data['action'] === 'approve_quote' && ! $this->awaitsQuoteDecision($item)) {
            throw ValidationException::withMessages(['action' => 'This quotation is not awaiting approval.']);
        }

        if ($data['action'] === 'approve_proof' && ! $this->awaitsProofDecision($item)) {
            throw ValidationException::withMessages(['action' => 'This proof is not awaiting approval.']);
        }

        [$to, $event, $attributes] = match ($data['action']) {
            'approve_quote' => ['quote_approved', 'quote_approved', ['customer_responded_at' => now()]],
            'approve_proof' => ['ready_for_print', 'proof_approved', ['customer_responded_at' => now()]],
            'decline' => ['cancelled', 'quote_declined', ['customer_responded_at' => now()]],
        };
        $this->workflow->transition($item, $to, $event, auth('customer')->user(), $data['note'] ?? null, $attributes);

        return back()->with('success', $data['action'] === 'approve_quote' ? 'Quotation approved.' : 'Your response was sent.');
    }

    private function awaitsQuoteDecision(DesignCartItem $item): bool
    {
        return $item->quote_total !== null
            && $item->payment_status === 'not_requested'
            && in_array($item->status, ['quoted', 'changes_requested'], true);
    }

    private function awaitsProofDecision(DesignCartItem $item): bool
    {
        return $item->payment_status === 'paid'
            && in_array($item->status, ['proof_review', 'changes_requested'], true);
    }

    private function find(Request $request, string $id): DesignCartItem
    {
        return DesignCartItem::query()
            ->where('public_id', $id)
            ->where('customer_id', auth('customer')->id())
            ->with(['customer', 'product', 'events'])
            ->firstOrFail();
    }
}
