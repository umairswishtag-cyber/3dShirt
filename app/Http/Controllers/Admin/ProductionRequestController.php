<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DesignCartItem;
use App\Services\Production\ProductionRequestAlertService;
use App\Services\Production\ProductionRequestWorkflow;
use App\Services\Shopify\ShopifyDraftOrderService;
use App\Support\ProductionRequestData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductionRequestController extends Controller
{
    public function __construct(
        private readonly ProductionRequestWorkflow $workflow,
        private readonly ShopifyDraftOrderService $draftOrders,
        private readonly ProductionRequestAlertService $alerts,
    ) {}

    public function index(Request $request): Response
    {
        $admin = $request->user();
        $query = $this->queryFor($admin)->with(['customer:id,name,email', 'product:id,name']);
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $requests = $query->latest('updated_at')->paginate(25)->withQueryString();
        $unread = $this->alerts->countsByRequest($admin, $requests->getCollection()->pluck('id'));
        $requests->through(fn (DesignCartItem $item) => array_merge(
            ProductionRequestData::make($item),
            ['unreadMessages' => $unread->get($item->id, 0)],
        ));

        $base = $this->queryFor($admin);

        return Inertia::render('Admin/ProductionRequests/Index', [
            'requests' => $requests,
            'filters' => $request->only('status'),
            'counts' => [
                'new' => (clone $base)->where('status', 'submitted')->count(),
                'review' => (clone $base)->whereIn('status', ['under_review', 'changes_requested'])->count(),
                'awaitingCustomer' => (clone $base)->where('status', 'quoted')->count(),
                'payment' => (clone $base)->whereIn('status', ['quote_approved', 'payment_pending'])->count(),
                'production' => (clone $base)->whereIn('status', ['paid', 'proof_review', 'ready_for_print', 'printing'])->count(),
            ],
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $item = $this->findFor($request, $id);
        $this->alerts->markRead($item, $request->user());

        return Inertia::render('Admin/ProductionRequests/Show', [
            'productionRequest' => ProductionRequestData::make($item, true),
        ]);
    }

    public function message(Request $request, string $id): RedirectResponse
    {
        $item = $this->findFor($request, $id);
        $data = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);
        $this->workflow->record(
            $item,
            'message_sent',
            $request->user(),
            trim($data['message']),
            createsAlert: true,
        );
        $this->alerts->markRead($item, $request->user());

        return back()->with('success', 'Message sent.');
    }

    public function quote(Request $request, string $id): RedirectResponse
    {
        $item = $this->findFor($request, $id);
        $data = $request->validate([
            'unit_price' => ['required', 'numeric', 'min:0.01'],
            'shipping' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ]);
        $this->workflow->quote($item, $data, $request->user());

        return back()->with('success', 'Quotation sent to the customer.');
    }

    public function action(Request $request, string $id): RedirectResponse
    {
        $item = $this->findFor($request, $id);
        $data = $request->validate([
            'action' => ['required', Rule::in(['review', 'request_changes', 'reject', 'mark_paid', 'proof_review', 'ready_for_print', 'start_printing', 'complete', 'cancel'])],
            'note' => [Rule::requiredIf(fn () => in_array($request->input('action'), ['request_changes', 'reject'], true)), 'nullable', 'string', 'max:3000'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
        ]);
        [$to, $event, $attributes] = match ($data['action']) {
            'review' => ['under_review', 'review_started', ['reviewed_at' => now()]],
            'request_changes' => ['changes_requested', 'changes_requested', ['admin_note' => $data['note']]],
            'reject' => ['rejected', 'request_rejected', ['admin_note' => $data['note']]],
            'mark_paid' => ['paid', 'payment_cleared', ['payment_status' => 'paid', 'payment_cleared_at' => now(), 'payment_reference' => $data['payment_reference'] ?? null]],
            'proof_review' => ['proof_review', 'proof_sent', []],
            'ready_for_print' => ['ready_for_print', 'approved_for_print', []],
            'start_printing' => ['printing', 'printing_started', ['print_started_at' => now()]],
            'complete' => ['completed', 'production_completed', ['completed_at' => now()]],
            'cancel' => ['cancelled', 'request_cancelled', []],
        };
        $this->workflow->transition($item, $to, $event, $request->user(), $data['note'] ?? null, $attributes);

        return back()->with('success', 'Production request updated.');
    }

    public function invoice(Request $request, string $id): RedirectResponse
    {
        $item = $this->findFor($request, $id);
        $store = $item->customer->store;
        $draft = $this->draftOrders->createAndSendInvoice($store, $item);
        if ($item->status === 'quote_approved') {
            $this->workflow->transition($item, 'payment_pending', 'shopify_invoice_sent', $request->user(), null, [
                'payment_status' => 'pending',
            ]);
        }
        $item->update([
            'shopify_draft_order_id' => $draft['id'],
            'shopify_draft_order_name' => $draft['name'] ?? null,
            'shopify_invoice_url' => $draft['invoiceUrl'] ?? null,
            'shopify_invoice_sent_at' => now(),
        ]);

        return back()->with('success', 'Shopify invoice created and emailed to the customer.');
    }

    private function queryFor($admin): Builder
    {
        return DesignCartItem::query()->when(
            ! $admin->isPlatformAdmin(),
            fn (Builder $query) => $query->whereHas('customer', fn (Builder $customers) => $customers->where('user_id', $admin->id)),
        );
    }

    private function findFor(Request $request, string $id): DesignCartItem
    {
        return $this->queryFor($request->user())
            ->where('public_id', $id)
            ->with(['customer.store', 'product', 'events'])
            ->firstOrFail();
    }
}
