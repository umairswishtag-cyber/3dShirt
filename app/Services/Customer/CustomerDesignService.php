<?php

namespace App\Services\Customer;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\CustomerDesign;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CustomerDesignService
{
    /** @return Collection<int, CustomerDesign> */
    public function allFor(Customer $customer): Collection
    {
        return $customer->designs()->latest('updated_at')->get();
    }

    public function findFor(Customer $customer, string $publicId): CustomerDesign
    {
        $design = $customer->designs()->where('public_id', $publicId)->firstOrFail();
        $design->forceFill(['last_opened_at' => now()])->save();

        return $design;
    }

    /** @param array<string, mixed> $input */
    public function save(Customer $customer, array $input): CustomerDesign
    {
        $data = Validator::make($input, [
            'id' => ['nullable', 'uuid'],
            'title' => ['required', 'string', 'max:160'],
            'status' => ['required', Rule::in(['DRAFT', 'FINAL'])],
            'productId' => ['required', 'string', 'max:160'],
            'productName' => ['required', 'string', 'max:160'],
            'document' => ['required', 'string', 'max:524288'],
        ])->validate();

        json_decode($data['document'], true, 512, JSON_THROW_ON_ERROR);
        $product = ConfiguratorProduct::query()
            ->where('user_id', $customer->user_id)
            ->where('slug', $data['productId'])
            ->where('is_published', true)
            ->firstOrFail();
        $design = isset($data['id'])
            ? $customer->designs()->where('public_id', $data['id'])->firstOrFail()
            : new CustomerDesign(['customer_id' => $customer->id]);
        $status = strtolower($data['status']);

        $design->fill([
            'configurator_product_id' => $product?->id,
            'product_slug' => $data['productId'],
            'product_name' => $product->name,
            'title' => $data['title'],
            'status' => $status,
            'document_version' => 1,
            'document' => $data['document'],
            'finalized_at' => $status === 'final' ? ($design->finalized_at ?? now()) : null,
        ]);
        $design->save();

        return $design;
    }

    public function delete(Customer $customer, string $publicId): bool
    {
        return (bool) $customer->designs()->where('public_id', $publicId)->firstOrFail()->delete();
    }
}
