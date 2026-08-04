<?php

namespace App\Http\Traits;

use App\Models\DesignCartItem;
use App\Models\User;
use App\Repositories\Order\OrderRepositoryInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Log;

trait ShopifyOrderTrait
{
    use ResponseTrait;

    protected $order;

    public function getOrderRepository(OrderRepositoryInterface $order)
    {
        $this->order = $order;
    }

    public function getOrdersFromShopify(User $user)
    {
        try {
            $orderCount = $this->getOrdersCountFromShopify($user);
            $cursor = 'null';
            $loop = ceil($orderCount / 250);
            $hasErrors = false;
            for ($i = 1; $i <= $loop; $i++) {
                [$orders, $nextCursor] = $this->shopifyGraphqlOrderQuery($user, $cursor);
                if ($orders && $nextCursor) {
                    $cursor = '"'.$nextCursor.'"';
                    foreach ($orders as $order) {
                        $order = $this->transformShopifyOrderData($order);
                        Log::info('Order Data: '.json_encode($order, JSON_PRETTY_PRINT));
                        if (! $this->storeData($this->arrayToObject($order), $user)) {
                            $hasErrors = true;
                        }
                    }
                } elseif ($orders === null) {
                    $hasErrors = true;
                }
            }
            if ($hasErrors) {
                throw new \Exception('Some Orders could not be stored.');
            }

            // Installs completed before order-data approval can be missing their
            // order webhooks. Repair them after Shopify confirms order access.
            $this->ensureOrderWebhookSubscriptions($user);
        } catch (\Exception $e) {
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));

            return false;
        }

        return true;
    }

    public function ensureOrderWebhookSubscriptions(User $user): bool
    {
        $query = <<<'QUERY'
            query OrderWebhookSubscriptions {
                webhookSubscriptions(first: 100) {
                    edges {
                        node {
                            topic
                            uri
                        }
                    }
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            Log::warning('Unable to inspect Shopify order webhooks: '.json_encode($result->errors));

            return false;
        }

        $subscriptions = collect($result->body->data->webhookSubscriptions->edges ?? [])
            ->map(fn ($edge) => $edge->node);
        $required = [
            'ORDERS_CREATE' => url('/webhook/orders-create'),
            'ORDERS_UPDATED' => url('/webhook/orders-updated'),
            'ORDERS_DELETE' => url('/webhook/orders-delete'),
        ];
        $mutation = <<<'QUERY'
            mutation CreateOrderWebhook($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) {
                webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) {
                    webhookSubscription { id topic uri }
                    userErrors { field message }
                }
            }
        QUERY;
        $successful = true;

        foreach ($required as $topic => $uri) {
            $alreadyRegistered = $subscriptions->contains(
                fn ($subscription) => $subscription->topic === $topic
                    && rtrim((string) $subscription->uri, '/') === rtrim($uri, '/'),
            );
            if ($alreadyRegistered) {
                continue;
            }

            $created = $this->arrayToObject($user->api()->graph($mutation, [
                'topic' => $topic,
                'subscription' => ['uri' => $uri],
            ]));
            $userErrors = $created->body->data->webhookSubscriptionCreate->userErrors ?? [];
            if ($created->errors || $userErrors) {
                $successful = false;
                Log::warning("Unable to register Shopify {$topic} webhook: ".json_encode(
                    $created->errors ?: $userErrors,
                ));
            }
        }

        return $successful;
    }

    public function getOrdersCountFromShopify($user)
    {
        $query = <<<'QUERY'
            query{
                ordersCount(limit: 2000){
                    count
                    precision
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        Log::info('Orders Count Query Result: '.json_encode($result, JSON_PRETTY_PRINT));
        if ($result->errors) {
            return 0;
        } else {
            $count = $result->body->data->ordersCount->count;
            Cache::put("shopify:orders-reported-count:{$user->id}", $count, now()->addDay());

            return $count;
        }
    }

    public function shopifyGraphqlOrderQuery($user, $cursor)
    {
        $query = <<<QUERY
            query {
                orders(first: 250, after: $cursor) {
                    edges {
                        node {
                            id
                            createdAt
                            currencyCode
                            email
                            displayFinancialStatus
                            displayFulfillmentStatus
                            name
                            note
                            phone
                            subtotalPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            tags
                            totalDiscountsSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalOutstandingSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalShippingPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalTaxSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalTipReceivedSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalWeight
                            customer {
                                id
                                email
                                firstName
                                lastName
                                phone
                            }
                            lineItems(first: 250) {
                                edges {
                                    node {
                                        id
                                        originalUnitPriceSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        quantity
                                        sku
                                        title
                                        totalDiscountSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        variant {
                                            id
                                        }
                                        customAttributes {
                                            key
                                            value
                                        }
                                    }
                                }
                            }
                            shippingAddress {
                                firstName
                                lastName
                                address1
                                phone
                                city
                                zip
                                province
                                country
                                company
                                countryCodeV2
                                provinceCode
                            }
                            fulfillments(first: 250){
                                id
                                location{
                                    id
                                }
                                name
                                service{
                                    type
                                }
                                displayStatus
                                status
                                trackingInfo{
                                    company
                                    number
                                    url
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            Log::warning('Full Shopify order query was rejected; retrying without protected customer fields.');

            return $this->shopifyGraphqlBasicOrderQuery($user, $cursor);
        } else {
            Cache::forget("shopify:orders-access-restricted:{$user->id}");
            $orders = $result->body->data->orders->edges;
            $cursor = $result->body->data->orders->pageInfo->endCursor;

            return [$orders, $cursor];
        }
    }

    public function shopifyGraphqlBasicOrderQuery($user, $cursor)
    {
        $query = <<<QUERY
            query {
                orders(first: 250, after: $cursor) {
                    edges {
                        node {
                            id
                            createdAt
                            currencyCode
                            displayFinancialStatus
                            displayFulfillmentStatus
                            name
                            subtotalPriceSet { shopMoney { amount } }
                            tags
                            totalDiscountsSet { shopMoney { amount } }
                            totalOutstandingSet { shopMoney { amount } }
                            totalPriceSet { shopMoney { amount } }
                            totalShippingPriceSet { shopMoney { amount } }
                            totalTaxSet { shopMoney { amount } }
                            totalTipReceivedSet { shopMoney { amount } }
                            totalWeight
                            lineItems(first: 250) {
                                edges {
                                    node {
                                        id
                                        originalUnitPriceSet { shopMoney { amount } }
                                        quantity
                                        sku
                                        title
                                        totalDiscountSet { shopMoney { amount } }
                                        variant { id }
                                        customAttributes { key value }
                                    }
                                }
                            }
                        }
                    }
                    pageInfo { hasNextPage endCursor }
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            Log::error('Privacy-safe Shopify order query failed: '.json_encode($result->errors));
            $messages = collect($result->errors)->pluck('message')->implode(' ');
            if (str_contains(strtolower($messages), 'not approved to access the order object')) {
                Cache::put("shopify:orders-access-restricted:{$user->id}", true, now()->addDay());
            }

            return [null, null];
        }

        Cache::forget("shopify:orders-access-restricted:{$user->id}");

        return [
            $result->body->data->orders->edges,
            $result->body->data->orders->pageInfo->endCursor,
        ];
    }

    public function storeData($order, User $user, $update = false)
    {
        DB::beginTransaction();
        try {
            $formatdData = $this->formatOrderData($order, $user);
            if ($update) {
                $order = $this->order->getByShopifyId($order->id, $user->id);
                if (! $order) {
                    Log::info('Order May be deleted: '.json_encode($order, JSON_PRETTY_PRINT));
                    DB::rollBack();

                    return true;
                }
            }
            $this->order->updateOrCreate($formatdData);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to store Order: '.json_encode($order));
            Log::error('Exception: '.json_encode($e->getMessage(), JSON_PRETTY_PRINT));

            return false;
        }
        DB::commit();

        return true;
    }

    public function formatOrderData($order, $user)
    {
        $formatdOrder = [
            'shopify_order_id' => $order->id,
            'shopify_created_at' => $order->created_at ?? null,
            'user_id' => $user->id,
            'contact_email' => $order->contact_email,
            'email' => $order->email,
            'financial_status' => $order->financial_status ? strtoupper($order->financial_status) : 'UNPAID',
            'fulfillment_status' => $order->fulfillment_status ? strtoupper($order->fulfillment_status) : 'UNFULFILLED',
            'name' => $order->name,
            'note' => $order->note,
            'phone' => $order->phone,
            'currency' => $order->currency ?? 'USD',
            'subtotal_price' => $order->subtotal_price,
            'tags' => $order->tags,
            'total_discounts' => $order->total_discounts,
            'total_line_items_price' => $order->total_line_items_price,
            'total_outstanding' => $order->total_outstanding,
            'total_price' => $order->total_price,
            'total_shipping_price' => $order->total_shipping_price
                ?? $order->total_shipping_price_set->shop_money->amount
                ?? 0,
            'total_tax' => $order->total_tax,
            'total_tip_received' => $order->total_tip_received,
            'total_weight' => $order->total_weight,
            'customer' => $this->formatOrderCustomerData($order->customer),
            'line_items' => $this->formatOrderLineItemsData(
                $order->line_items,
                $user,
                $formatdOrder['financial_status'],
                $order->id,
            ),
            'shipping_address' => $this->formatOrderShippingAddressData($order->shipping_address),
            'fulfillments' => $this->formatOrderFulfillmentsData($order->fulfillments),
        ];

        return $formatdOrder;
    }

    public function formatOrderCustomerData($customer)
    {
        if (! $customer) {
            return null;
        }
        $orderCustomer = [
            'shopify_customer_id' => $customer->id,
            'email' => $customer->email,
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
            'phone' => $customer->phone,
        ];

        return $orderCustomer;
    }

    public function formatOrderLineItemsData($lineItems, User $user, ?string $financialStatus = null, mixed $shopifyOrderId = null)
    {
        $orderLineItems = [];
        foreach ($lineItems as $item) {
            $rawProperties = $item->properties ?? $item->custom_attributes ?? [];
            $properties = [];
            foreach ($rawProperties as $property) {
                $key = (string) ($property->name ?? $property->key ?? '');
                if ($key !== '') {
                    $properties[$key] = (string) ($property->value ?? '');
                }
            }
            $designCartItem = isset($properties['_3d_job_id'])
                ? DesignCartItem::query()
                    ->where('public_id', $properties['_3d_job_id'])
                    ->whereHas('customer', fn ($query) => $query->where('user_id', $user->id))
                    ->first()
                : null;
            if ($designCartItem) {
                $paid = in_array(strtoupper((string) $financialStatus), ['PAID', 'PARTIALLY_PAID'], true);
                $paymentPending = in_array(strtoupper((string) $financialStatus), ['AUTHORIZED', 'PENDING', 'PARTIALLY_PAID'], true);
                $nextStatus = $designCartItem->status;
                if (! in_array($nextStatus, ['ready_for_print', 'printing', 'completed'], true)) {
                    $nextStatus = $paid
                        ? 'paid'
                        : ($paymentPending && in_array($nextStatus, ['quoted', 'quote_approved', 'payment_pending'], true)
                            ? 'payment_pending'
                            : ($designCartItem->assets_uploaded_at ? 'ordered' : 'ordered_missing_assets'));
                }
                $previousStatus = $designCartItem->status;
                $designCartItem->update([
                    'status' => $nextStatus,
                    'payment_status' => $paid ? 'paid' : ($paymentPending ? 'pending' : $designCartItem->payment_status),
                    'payment_cleared_at' => $paid ? ($designCartItem->payment_cleared_at ?? now()) : $designCartItem->payment_cleared_at,
                    'shopify_order_id' => $shopifyOrderId ? (int) preg_replace('/\D/', '', (string) $shopifyOrderId) : $designCartItem->shopify_order_id,
                    'ordered_at' => $designCartItem->ordered_at ?? now(),
                ]);
                if ($previousStatus !== $nextStatus) {
                    $designCartItem->events()->create([
                        'actor_type' => 'shopify',
                        'event' => $paid ? 'shopify_payment_cleared' : 'shopify_order_received',
                        'from_status' => $previousStatus,
                        'to_status' => $nextStatus,
                    ]);
                }
            }

            $orderLineItems[] = [
                'shopify_order_lineitem_id' => $item->id,
                'price' => $item->price,
                'quantity' => $item->quantity,
                'sku' => $item->sku,
                'title' => $item->title,
                'total_discount' => $item->total_discount,
                'shopify_product_variant_id' => $item->variant_id,
                'design_cart_item_id' => $designCartItem?->id,
                'customization_properties' => $properties ?: null,
            ];
        }

        return $orderLineItems;
    }

    public function formatOrderShippingAddressData($shippingAddress)
    {
        if (! $shippingAddress) {
            return null;
        }
        $orderShippingAddress = [
            'first_name' => $shippingAddress->first_name,
            'last_name' => $shippingAddress->last_name,
            'address1' => $shippingAddress->address1,
            'phone' => $shippingAddress->phone,
            'city' => $shippingAddress->city,
            'zip' => $shippingAddress->zip,
            'province' => $shippingAddress->province,
            'country' => $shippingAddress->country,
            'company' => $shippingAddress->company,
            'country_code' => $shippingAddress->country_code,
            'province_code' => $shippingAddress->province_code,
        ];

        return $orderShippingAddress;
    }

    public function formatOrderFulfillmentsData($fulfillment)
    {
        $orderFulfillments = [];
        foreach ($fulfillment as $fulfill) {
            $orderFulfillments[] = [
                'shopify_order_fulfillment_id' => $fulfill->id,
                'shopify_order_fulfillment_location_id' => $fulfill->location_id,
                'name' => $fulfill->name,
                'service' => $fulfill->service ? strtoupper($fulfill->service) : null,
                'shipment_status' => $fulfill->shipment_status ? strtoupper($fulfill->shipment_status) : null,
                'status' => $fulfill->status ? strtoupper($fulfill->status) : null,
                'tracking_company' => $fulfill->tracking_company,
                'tracking_number' => $fulfill->tracking_number,
                'tracking_url' => $fulfill->tracking_url,
            ];
        }

        return $orderFulfillments;
    }

    public function deleteOrder($orderId, User $user)
    {
        DB::beginTransaction();
        try {
            $order = $this->order->getByShopifyId($orderId, $user->id);
            if (! $order) {
                DB::rollBack();

                return true;
            }
            $this->order->delete($order->id);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));

            return false;
        }
        DB::commit();

        return true;
    }

    public function transformShopifyOrderData($data): array
    {
        $node = $data->node;
        $orderLineItems = [];
        if (! empty($node->lineItems->edges)) {
            foreach ($node->lineItems->edges as $edge) {
                $lineItem = $edge->node;
                $orderLineItems[] = [
                    'id' => $this->extractId($lineItem->id),
                    'price' => $lineItem->originalUnitPriceSet->shopMoney->amount ?? null,
                    'quantity' => $lineItem->quantity ?? null,
                    'sku' => $lineItem->sku ?? null,
                    'title' => $lineItem->title ?? null,
                    'total_discount' => $lineItem->totalDiscountSet->shopMoney->amount ?? 0,
                    'variant_id' => $lineItem->variant?->id ? $this->extractId($lineItem->variant->id) : null,
                    'custom_attributes' => $lineItem->customAttributes ?? [],
                ];
            }
        }
        $fulfillments = [];
        if (! empty($node->fulfillments)) {
            foreach ($node->fulfillments as $fulfillment) {
                $tracking = $fulfillment->trackingInfo[0] ?? null;
                $fulfillments[] = [
                    'id' => $this->extractId($fulfillment->id),
                    'location_id' => isset($fulfillment->location->id)
                        ? $this->extractId($fulfillment->location->id)
                        : null,
                    'name' => $fulfillment->name ?? null,
                    'service' => $fulfillment->service->type ?? null,
                    'shipment_status' => $fulfillment->displayStatus ?? null,
                    'status' => $fulfillment->status ?? null,
                    'tracking_company' => $tracking->company ?? null,
                    'tracking_number' => $tracking->number ?? null,
                    'tracking_url' => $tracking->url ?? null,
                ];
            }
        }
        $customer = $node->customer ?? null;
        if (! empty($customer)) {
            $customer = [
                'id' => $this->extractId($customer->id),
                'email' => $customer->email ?? null,
                'first_name' => $customer->firstName ?? null,
                'last_name' => $customer->lastName ?? null,
                'phone' => $customer->phone ?? null,
            ];
        }
        $shippingAddress = $node->shippingAddress ?? null;
        if (! empty($shippingAddress)) {
            $shippingAddress = [
                'first_name' => $shippingAddress->firstName,
                'last_name' => $shippingAddress->lastName,
                'address1' => $shippingAddress->address1,
                'phone' => $shippingAddress->phone,
                'city' => $shippingAddress->city,
                'zip' => $shippingAddress->zip,
                'province' => $shippingAddress->province,
                'country' => $shippingAddress->country,
                'company' => $shippingAddress->company,
                'country_code' => $shippingAddress->countryCodeV2,
                'province_code' => $shippingAddress->provinceCode,
            ];
        }
        $order = [
            'id' => $this->extractId($node->id),
            'created_at' => $node->createdAt ?? null,
            'currency' => $node->currencyCode ?? 'USD',
            'contact_email' => $node->email ?? null,
            'email' => $node->email ?? null,
            'financial_status' => $node->displayFinancialStatus,
            'fulfillment_status' => $node->displayFulfillmentStatus,
            'name' => $node->name,
            'note' => $node->note ?? null,
            'phone' => $node->phone ?? null,
            'subtotal_price' => $node->subtotalPriceSet->shopMoney->amount ?? 0,
            'tags' => $this->arrayToString($node->tags),
            'total_discounts' => $node->totalDiscountsSet->shopMoney->amount ?? 0,
            'total_line_items_price' => 0,
            'total_outstanding' => $node->totalOutstandingSet->shopMoney->amount ?? 0,
            'total_price' => $node->totalPriceSet->shopMoney->amount ?? 0,
            'total_shipping_price' => $node->totalShippingPriceSet->shopMoney->amount ?? 0,
            'total_tax' => $node->totalTaxSet->shopMoney->amount ?? 0,
            'total_tip_received' => $node->totalTipReceivedSet->shopMoney->amount ?? 0,
            'total_weight' => $node->totalWeight,
            'line_items' => $orderLineItems,
            'customer' => $customer,
            'shipping_address' => $shippingAddress,
            'fulfillments' => $fulfillments,
        ];

        return $order;
    }

    public function arrayToObject($data)
    {
        return json_decode(json_encode($data));
    }

    public function arrayToString($data)
    {
        if (is_array($data)) {
            if (empty($data)) {
                return '';
            } else {
                return implode(',', $data);
            }
        }

        return $data;
    }

    public function extractId($id)
    {
        $arr = explode('/', $id);

        return end($arr);
    }
}
