<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ShopifyOrderTrait;
use App\Models\DesignCartItem;
use App\Models\Orders\Order;
use App\Repositories\Order\OrderRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StoreOrderController extends Controller
{
    use ShopifyOrderTrait;

    public function index(Request $request): Response
    {
        $admin = $request->user();
        $filters = $request->validate([
            'query' => ['nullable', 'string', 'max:100'],
            'payment' => ['nullable', 'string', 'max:40'],
            'fulfillment' => ['nullable', 'string', 'max:40'],
            'period' => ['nullable', 'in:all,7d,30d,90d'],
        ]);

        $query = $this->ordersFor($request)
            ->with(['orderCustomer:id,first_name,last_name,email', 'user:id,name'])
            ->withSum('orderLineItems as item_quantity', 'quantity')
            ->withCount([
                'orderLineItems as customized_items_count' => fn (Builder $query) => $query->whereNotNull('design_cart_item_id'),
            ]);

        $search = trim((string) ($filters['query'] ?? ''));
        $query
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('contact_email', 'like', "%{$search}%")
                        ->when(is_numeric($search), fn (Builder $query) => $query->orWhere('shopify_order_id', $search))
                        ->orWhereHas('orderCustomer', function (Builder $customer) use ($search): void {
                            $customer->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['payment'] ?? null, fn (Builder $query, string $status) => $query->where('financial_status', strtoupper($status)))
            ->when($filters['fulfillment'] ?? null, fn (Builder $query, string $status) => $query->where('fulfillment_status', strtoupper($status)))
            ->when(($filters['period'] ?? 'all') !== 'all', function (Builder $query) use ($filters): void {
                $days = (int) rtrim($filters['period'], 'd');
                $cutoff = now()->subDays($days);
                $query->where(fn (Builder $query) => $query
                    ->where('shopify_created_at', '>=', $cutoff)
                    ->orWhere(fn (Builder $query) => $query
                        ->whereNull('shopify_created_at')
                        ->where('created_at', '>=', $cutoff)));
            });

        $summaryQuery = $this->ordersFor($request);
        $summary = [
            'total' => (clone $summaryQuery)->count(),
            'paid' => (clone $summaryQuery)->where('financial_status', 'PAID')->count(),
            'needsFulfillment' => (clone $summaryQuery)
                ->where(fn (Builder $query) => $query->whereNull('fulfillment_status')->orWhere('fulfillment_status', '!=', 'FULFILLED'))
                ->count(),
            'customized' => (clone $summaryQuery)->whereHas(
                'orderLineItems',
                fn (Builder $query) => $query->whereNotNull('design_cart_item_id'),
            )->count(),
        ];

        $orders = $query->orderByRaw('COALESCE(shopify_created_at, created_at) DESC')->paginate(20)->withQueryString()->through(
            fn (Order $order) => $this->indexOrder($order, $admin->isPlatformAdmin()),
        );

        return Inertia::render('Admin/Orders/Index', [
            'orders' => $orders,
            'summary' => $summary,
            'filters' => [
                'query' => $search,
                'payment' => $filters['payment'] ?? '',
                'fulfillment' => $filters['fulfillment'] ?? '',
                'period' => $filters['period'] ?? 'all',
            ],
            'platformView' => $admin->isPlatformAdmin(),
            'accessRestricted' => ! $admin->isPlatformAdmin()
                && (bool) Cache::get("shopify:orders-access-restricted:{$admin->id}", false),
            'shopifyReportedCount' => ! $admin->isPlatformAdmin()
                ? (int) Cache::get("shopify:orders-reported-count:{$admin->id}", 0)
                : null,
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        abort_unless($request->user()->isPlatformAdmin() || $order->user_id === $request->user()->id, 404);

        $order->load([
            'user:id,name',
            'orderCustomer',
            'orderShippingAddress',
            'orderFulfillments',
            'orderLineItems.designCartItem.product',
            'orderLineItems.designCartItem.customer',
            'orderLineItems.designCartItem.design',
        ]);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $this->detailOrder($order),
            'platformView' => $request->user()->isPlatformAdmin(),
        ]);
    }

    public function sync(Request $request, OrderRepositoryInterface $orders): RedirectResponse
    {
        $admin = $request->user();
        abort_if($admin->isPlatformAdmin(), 403, 'Select a store before syncing orders.');

        $this->getOrderRepository($orders);
        if (! $this->getOrdersFromShopify($admin)) {
            return back()->with(
                'error',
                'Shopify is still blocking Order access. Enable protected customer data access, then try again.',
            );
        }

        return back()->with('success', 'Orders synced from Shopify.');
    }

    private function ordersFor(Request $request): Builder
    {
        return Order::query()->when(
            ! $request->user()->isPlatformAdmin(),
            fn (Builder $query) => $query->where('user_id', $request->user()->id),
        );
    }

    private function indexOrder(Order $order, bool $platformView): array
    {
        $customer = $order->orderCustomer;
        $customerName = trim(implode(' ', array_filter([$customer?->first_name, $customer?->last_name])));

        return [
            'id' => $order->id,
            'shopifyId' => $order->shopify_order_id,
            'name' => $order->name ?: '#'.$order->shopify_order_id,
            'customerName' => $customerName ?: 'Guest customer',
            'customerEmail' => $customer?->email ?: $order->email ?: $order->contact_email,
            'paymentStatus' => strtolower($order->financial_status ?: 'unpaid'),
            'fulfillmentStatus' => strtolower($order->fulfillment_status ?: 'unfulfilled'),
            'itemQuantity' => (int) ($order->item_quantity ?? 0),
            'customizedItemsCount' => (int) $order->customized_items_count,
            'total' => (float) ($order->total_price ?? 0),
            'createdAt' => ($order->shopify_created_at ?: $order->created_at)?->toIso8601String(),
            'currency' => $order->currency ?: 'USD',
            'store' => $platformView ? $order->user?->name : null,
            'url' => route('admin.orders.show', $order),
        ];
    }

    private function detailOrder(Order $order): array
    {
        $customer = $order->orderCustomer;
        $address = $order->orderShippingAddress;
        $storeDomain = str_ends_with(strtolower((string) $order->user?->name), '.myshopify.com')
            ? $order->user->name
            : null;

        return [
            'id' => $order->id,
            'shopifyId' => $order->shopify_order_id,
            'name' => $order->name ?: '#'.$order->shopify_order_id,
            'createdAt' => ($order->shopify_created_at ?: $order->created_at)?->toIso8601String(),
            'currency' => $order->currency ?: 'USD',
            'paymentStatus' => strtolower($order->financial_status ?: 'unpaid'),
            'fulfillmentStatus' => strtolower($order->fulfillment_status ?: 'unfulfilled'),
            'email' => $order->email ?: $order->contact_email,
            'phone' => $order->phone,
            'note' => $order->note,
            'tags' => collect(explode(',', (string) $order->tags))->map(fn (string $tag) => trim($tag))->filter()->values(),
            'store' => $order->user?->name,
            'shopifyAdminUrl' => $storeDomain && $order->shopify_order_id
                ? "https://{$storeDomain}/admin/orders/{$order->shopify_order_id}"
                : null,
            'customer' => [
                'name' => trim(implode(' ', array_filter([$customer?->first_name, $customer?->last_name]))) ?: 'Guest customer',
                'email' => $customer?->email ?: $order->email ?: $order->contact_email,
                'phone' => $customer?->phone ?: $order->phone,
            ],
            'shippingAddress' => $address ? Arr::only($address->toArray(), [
                'first_name', 'last_name', 'company', 'address1', 'city', 'zip', 'province',
                'province_code', 'country', 'country_code', 'phone',
            ]) : null,
            'lineItems' => $order->orderLineItems->map(fn ($lineItem) => [
                'id' => $lineItem->id,
                'shopifyId' => $lineItem->shopify_order_lineitem_id,
                'title' => $lineItem->title,
                'sku' => $lineItem->sku,
                'quantity' => (int) $lineItem->quantity,
                'unitPrice' => (float) ($lineItem->price ?? 0),
                'discount' => (float) ($lineItem->total_discount ?? 0),
                'lineTotal' => max(0, ((float) $lineItem->price * (int) $lineItem->quantity) - (float) $lineItem->total_discount),
                'properties' => $lineItem->customization_properties ?? [],
                'thumbnailUrl' => $this->thumbnailUrl($lineItem->designCartItem?->product),
                'production' => $lineItem->designCartItem
                    ? $this->productionJob($lineItem->designCartItem)
                    : null,
            ])->values(),
            'fulfillments' => $order->orderFulfillments->map(fn ($fulfillment) => [
                'id' => $fulfillment->id,
                'name' => $fulfillment->name,
                'status' => strtolower($fulfillment->status ?: 'pending'),
                'shipmentStatus' => strtolower($fulfillment->shipment_status ?: ''),
                'service' => $fulfillment->service,
                'trackingCompany' => $fulfillment->tracking_company,
                'trackingNumber' => $fulfillment->tracking_number,
                'trackingUrl' => $fulfillment->tracking_url,
            ])->values(),
            'totals' => [
                'subtotal' => (float) ($order->subtotal_price ?? $order->total_line_items_price ?? 0),
                'discounts' => (float) ($order->total_discounts ?? 0),
                'shipping' => (float) ($order->total_shipping_price ?? 0),
                'tax' => (float) ($order->total_tax ?? 0),
                'tips' => (float) ($order->total_tip_received ?? 0),
                'total' => (float) ($order->total_price ?? 0),
                'outstanding' => (float) ($order->total_outstanding ?? 0),
            ],
        ];
    }

    private function productionJob(DesignCartItem $job): array
    {
        return [
            'id' => $job->public_id,
            'status' => $job->status,
            'summary' => $job->summary ?? [],
            'orderedAt' => $job->ordered_at?->toIso8601String(),
            'assets' => [
                'model' => $job->final_model_path ? route('admin.production-jobs.model', $job->public_id) : null,
                'pattern' => $job->pattern_path ? route('admin.production-jobs.pattern', $job->public_id) : null,
                'printAreas' => collect($job->print_area_paths ?? [])->mapWithKeys(fn ($path, $areaId) => [
                    $areaId => route('admin.production-jobs.print-area', ['id' => $job->public_id, 'areaId' => $areaId]),
                ]),
                'logos' => collect($job->logo_paths ?? [])->mapWithKeys(fn ($path, $logoId) => [
                    $logoId => route('admin.production-jobs.logo', ['id' => $job->public_id, 'logoId' => $logoId]),
                ]),
            ],
        ];
    }

    private function thumbnailUrl($product): ?string
    {
        if (! $product) {
            return null;
        }

        return $product->thumbnail_path
            ? Storage::disk('public')->url($product->thumbnail_path)
            : $product->thumbnail_url;
    }
}
