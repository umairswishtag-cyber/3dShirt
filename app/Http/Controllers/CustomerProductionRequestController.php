<?php

namespace App\Http\Controllers;

use App\Models\DesignCartItem;
use App\Services\Production\ProductionRequestWorkflow;
use App\Services\Storefront\StorefrontContext;
use App\Support\ProductionRequestData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerProductionRequestController extends Controller
{
    public function __construct(
        private readonly ProductionRequestWorkflow $workflow,
        private readonly StorefrontContext $storefront,
    ) {}

    public function show(Request $request, string $store, string $id): Response
    {
        $item = $this->find($request, $id);

        return Inertia::render('Customer/Requests/Show', [
            'productionRequest' => ProductionRequestData::make($item, true),
            'storefront' => $this->storefront->links($this->storefront->require($request)),
        ]);
    }

    public function respond(Request $request, string $store, string $id): RedirectResponse
    {
        $item = $this->find($request, $id);
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve_quote', 'approve_proof', 'request_changes', 'decline'])],
            'note' => [Rule::requiredIf(fn () => $request->input('action') === 'request_changes'), 'nullable', 'string', 'max:3000'],
        ]);
        [$to, $event, $attributes] = match ($data['action']) {
            'approve_quote' => ['quote_approved', 'quote_approved', ['customer_responded_at' => now()]],
            'approve_proof' => ['ready_for_print', 'proof_approved', ['customer_responded_at' => now()]],
            'request_changes' => ['changes_requested', 'customer_changes_requested', ['customer_responded_at' => now(), 'customer_note' => $data['note']]],
            'decline' => ['cancelled', 'quote_declined', ['customer_responded_at' => now()]],
        };
        $this->workflow->transition($item, $to, $event, auth('customer')->user(), $data['note'] ?? null, $attributes);

        return back()->with('success', $data['action'] === 'approve_quote' ? 'Quotation approved.' : 'Your response was sent.');
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
