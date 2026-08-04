<?php

namespace App\Services\Shopify;

use App\Models\DesignCartItem;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use Throwable;

class ShopifyDraftOrderService
{
    /** @return array{id: string, name: string, invoiceUrl: ?string} */
    public function createAndSendInvoice(User $store, DesignCartItem $request): array
    {
        $request->loadMissing('customer', 'product');
        if (! $request->quote_total || ! in_array($request->status, ['quote_approved', 'payment_pending'], true)) {
            $this->fail('The customer must approve a valid quote before an invoice can be sent.');
        }

        // Use the approved grand total as one custom line so the Shopify checkout
        // exactly matches the versioned portal quote (including shipping/tax/discount).
        $linePrice = number_format((float) $request->quote_total, 2, '.', '');
        $input = [
            'email' => $request->customer->email,
            'note' => "Custom production request {$request->public_id}",
            'tags' => ['3D configurator', 'Custom quotation'],
            'lineItems' => [[
                'title' => ($request->product?->name ?? 'Custom product').' - custom production ('.$request->quantity.' units)',
                'originalUnitPrice' => $linePrice,
                'quantity' => 1,
                'requiresShipping' => true,
                'taxable' => false,
                'customAttributes' => [
                    ['key' => '_3d_job_id', 'value' => $request->public_id],
                    ['key' => 'Design', 'value' => (string) ($request->summary['design'] ?? 'Custom design')],
                    ['key' => 'Requested quantity', 'value' => (string) $request->quantity],
                ],
            ]],
        ];
        if ($request->customer->shopify_customer_gid) {
            $input['customerId'] = $request->customer->shopify_customer_gid;
        }

        $created = $this->graph($store, <<<'GRAPHQL'
mutation CreateProductionDraft($input: DraftOrderInput!) {
  draftOrderCreate(input: $input) {
    draftOrder { id name invoiceUrl }
    userErrors { field message }
  }
}
GRAPHQL, ['input' => $input]);
        $payload = $created['draftOrderCreate'] ?? [];
        $this->userErrors($payload);
        $draft = $payload['draftOrder'] ?? null;
        if (! is_array($draft) || empty($draft['id'])) {
            $this->fail('Shopify did not return the new draft order.');
        }

        $sent = $this->graph($store, <<<'GRAPHQL'
mutation SendProductionInvoice($id: ID!, $email: EmailInput) {
  draftOrderInvoiceSend(id: $id, email: $email) {
    draftOrder { id name invoiceUrl }
    userErrors { field message }
  }
}
GRAPHQL, [
            'id' => $draft['id'],
            'email' => ['to' => $request->customer->email],
        ]);
        $sentPayload = $sent['draftOrderInvoiceSend'] ?? [];
        $this->userErrors($sentPayload);

        return $sentPayload['draftOrder'] ?? $draft;
    }

    /** @return array<string, mixed> */
    protected function graph(User $store, string $query, array $variables): array
    {
        try {
            $response = $store->api()->graph($query, $variables);
        } catch (Throwable $exception) {
            $this->fail('Shopify invoice could not be created: '.$exception->getMessage());
        }
        if (! empty($response['errors'])) {
            $message = collect($response['errors'])->pluck('message')->filter()->implode(' ');
            $this->fail($message ?: 'Shopify rejected the invoice request.');
        }

        return (array) data_get($response, 'body.data', []);
    }

    private function userErrors(array $payload): void
    {
        if (! empty($payload['userErrors'])) {
            $this->fail(collect($payload['userErrors'])->pluck('message')->filter()->implode(' '));
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['shopify' => $message]);
    }
}
