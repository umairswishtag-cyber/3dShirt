<?php

namespace App\Services\Configurator;

use App\Models\ConfiguratorProduct;
use App\Models\Products\Product as ShopifyProduct;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class ShopifyCatalogSyncService
{
    private const CLOTHING_CATEGORY_ID = 'gid://shopify/TaxonomyCategory/aa-1';

    public function shouldSync(User $store): bool
    {
        return str_ends_with(strtolower(trim((string) $store->name)), '.myshopify.com');
    }

    public function sync(ConfiguratorProduct $product, User $store): ConfiguratorProduct
    {
        $thumbnailInput = $this->thumbnailInput($product);
        $thumbnailChanged = $thumbnailInput !== null
            && $product->shopify_thumbnail_synced_path !== $this->thumbnailSourceKey($product);
        $previousMediaId = $product->shopify_media_id;
        $shopifyProduct = $product->shopify_product_id
            ? $this->updateProduct($product, $store, $thumbnailChanged ? [$thumbnailInput] : [])
            : $this->createProduct($product, $store, $thumbnailInput ? [$thumbnailInput] : []);

        $variant = Arr::first(Arr::get($shopifyProduct, 'variants.nodes', []));
        if (! is_array($variant)) {
            $this->fail('Shopify did not return a product variant.');
        }

        $mediaId = $product->shopify_media_id;
        if ($thumbnailChanged || (! $product->shopify_product_id && $thumbnailInput)) {
            $mediaId = $this->latestImageMediaId($shopifyProduct);
            if (! $mediaId) {
                $this->fail('Shopify did not accept the product thumbnail.');
            }

            $this->prioritizeProductMedia($store, $shopifyProduct['id'], $mediaId);

            if ($previousMediaId && $previousMediaId !== $mediaId) {
                $this->deleteProductMedia($store, $shopifyProduct['id'], $previousMediaId);
            }
        }

        $product->forceFill([
            'shopify_product_id' => $this->legacyId($shopifyProduct),
            'shopify_variant_id' => $this->legacyId($variant),
            'shopify_inventory_item_id' => isset($variant['inventoryItem'])
                ? $this->legacyId($variant['inventoryItem'])
                : $product->shopify_inventory_item_id,
            'shopify_media_id' => $mediaId,
            'shopify_thumbnail_synced_path' => $mediaId
                ? $this->thumbnailSourceKey($product)
                : $product->shopify_thumbnail_synced_path,
        ])->save();

        $variant = $this->updatePrice($store, $shopifyProduct['id'], $variant['id'], (string) $product->price);
        $inventoryItem = $variant['inventoryItem'] ?? null;
        if (! is_array($inventoryItem)) {
            $this->fail('Shopify did not return an inventory item for the product variant.');
        }

        if (! ($inventoryItem['tracked'] ?? false)) {
            $inventoryItem = $this->enableInventoryTracking($store, $inventoryItem['id']);
        }

        $this->setInventory($store, $product, $inventoryItem['id']);

        if (in_array($product->shopify_status, ['active', 'unlisted'], true)) {
            $this->publishToOnlineStore($store, $shopifyProduct['id']);
        }

        $product->forceFill([
            'shopify_variant_id' => $this->legacyId($variant),
            'shopify_inventory_item_id' => $this->legacyId($inventoryItem),
            'shopify_synced_at' => now(),
        ])->save();

        $this->updateLocalMirror($product, $store, $shopifyProduct, $variant);

        return $product->refresh();
    }

    private function createProduct(ConfiguratorProduct $product, User $store, array $media): array
    {
        $data = $this->graph($store, <<<'GRAPHQL'
            mutation CreateConfiguratorProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
              productCreate(product: $product, media: $media) {
                product {
                  id
                  legacyResourceId
                  handle
                  status
                  tags
                  media(first: 50) {
                    nodes { id mediaContentType status }
                  }
                  variants(first: 1) {
                    nodes {
                      id
                      legacyResourceId
                      title
                      price
                      inventoryQuantity
                      inventoryItem { id legacyResourceId tracked }
                    }
                  }
                }
                userErrors { field message }
              }
            }
            GRAPHQL, ['product' => $this->productInput($product), 'media' => $media]);

        return $this->payload($data, 'productCreate', 'product');
    }

    private function updateProduct(ConfiguratorProduct $product, User $store, array $media): array
    {
        $input = [
            'id' => $this->gid('Product', $product->shopify_product_id),
            ...$this->productInput($product),
        ];
        $data = $this->graph($store, <<<'GRAPHQL'
            mutation UpdateConfiguratorProduct($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
              productUpdate(product: $product, media: $media) {
                product {
                  id
                  legacyResourceId
                  handle
                  status
                  tags
                  media(first: 50) {
                    nodes { id mediaContentType status }
                  }
                  variants(first: 1) {
                    nodes {
                      id
                      legacyResourceId
                      title
                      price
                      inventoryQuantity
                      inventoryItem { id legacyResourceId tracked }
                    }
                  }
                }
                userErrors { field message }
              }
            }
            GRAPHQL, ['product' => $input, 'media' => $media]);

        return $this->payload($data, 'productUpdate', 'product');
    }

    private function updatePrice(User $store, string $productId, string $variantId, string $price): array
    {
        $data = $this->graph($store, <<<'GRAPHQL'
            mutation UpdateConfiguratorPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  legacyResourceId
                  title
                  price
                  inventoryQuantity
                  inventoryItem { id legacyResourceId tracked }
                }
                userErrors { field message }
              }
            }
            GRAPHQL, [
            'productId' => $productId,
            'variants' => [['id' => $variantId, 'price' => $price]],
        ]);

        $payload = $this->payload($data, 'productVariantsBulkUpdate');
        $variant = Arr::first($payload['productVariants'] ?? []);
        if (! is_array($variant)) {
            $this->fail('Shopify did not return the updated product price.');
        }

        return $variant;
    }

    private function enableInventoryTracking(User $store, string $inventoryItemId): array
    {
        $data = $this->graph($store, <<<'GRAPHQL'
            mutation EnableConfiguratorInventory($id: ID!, $input: InventoryItemInput!) {
              inventoryItemUpdate(id: $id, input: $input) {
                inventoryItem { id legacyResourceId tracked }
                userErrors { field message }
              }
            }
            GRAPHQL, ['id' => $inventoryItemId, 'input' => ['tracked' => true]]);

        return $this->payload($data, 'inventoryItemUpdate', 'inventoryItem');
    }

    private function setInventory(User $store, ConfiguratorProduct $product, string $inventoryItemId): void
    {
        $locationData = $this->graph($store, 'query ConfiguratorPrimaryLocation { location { id name isActive } }');
        $location = $locationData['location'] ?? null;
        if (! is_array($location) || ! ($location['isActive'] ?? false)) {
            $this->fail('Shopify does not have an active primary inventory location.');
        }

        $levelData = $this->graph($store, <<<'GRAPHQL'
            query ConfiguratorInventoryLevel($inventoryItemId: ID!, $locationId: ID!) {
              inventoryItem(id: $inventoryItemId) {
                inventoryLevel(locationId: $locationId) { id }
              }
            }
            GRAPHQL, ['inventoryItemId' => $inventoryItemId, 'locationId' => $location['id']]);

        if (! Arr::get($levelData, 'inventoryItem.inventoryLevel.id')) {
            $data = $this->graph($store, <<<'GRAPHQL'
                mutation ActivateConfiguratorInventory(
                  $inventoryItemId: ID!,
                  $locationId: ID!,
                  $available: Int!,
                  $idempotencyKey: String!
                ) {
                  inventoryActivate(
                    inventoryItemId: $inventoryItemId,
                    locationId: $locationId,
                    available: $available
                  ) @idempotent(key: $idempotencyKey) {
                    inventoryLevel { id }
                    userErrors { field message }
                  }
                }
                GRAPHQL, [
                'inventoryItemId' => $inventoryItemId,
                'locationId' => $location['id'],
                'available' => $product->inventory_quantity,
                'idempotencyKey' => $this->idempotencyKey('activate', $product, $inventoryItemId, $location['id']),
            ]);
            $this->payload($data, 'inventoryActivate');

            return;
        }

        $data = $this->graph($store, <<<'GRAPHQL'
            mutation SetConfiguratorInventory($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
              inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
                inventoryAdjustmentGroup { createdAt }
                userErrors { field message code }
              }
            }
            GRAPHQL, [
            'input' => [
                'name' => 'available',
                'reason' => 'correction',
                'referenceDocumentUri' => "gid://3DShirt/ConfiguratorProduct/{$product->id}",
                'quantities' => [[
                    'inventoryItemId' => $inventoryItemId,
                    'locationId' => $location['id'],
                    'quantity' => $product->inventory_quantity,
                    'changeFromQuantity' => null,
                ]],
            ],
            'idempotencyKey' => $this->idempotencyKey('set', $product, $inventoryItemId, $location['id']),
        ]);
        $this->payload($data, 'inventorySetQuantities');
    }

    private function publishToOnlineStore(User $store, string $productId): void
    {
        $data = $this->graph($store, <<<'GRAPHQL'
            query ConfiguratorPublications {
              publications(first: 30) {
                nodes {
                  id
                  catalog { title }
                  channels(first: 5) { nodes { name } }
                }
              }
            }
            GRAPHQL);
        $publication = collect(Arr::get($data, 'publications.nodes', []))->first(function ($publication) {
            $labels = collect([
                Arr::get($publication, 'catalog.title'),
                ...collect(Arr::get($publication, 'channels.nodes', []))->pluck('name')->all(),
            ])->filter()->map(fn ($label) => strtolower((string) $label));

            return $labels->contains(fn ($label) => str_contains($label, 'online store'));
        });

        if (! is_array($publication)) {
            return;
        }

        $publish = $this->graph($store, <<<'GRAPHQL'
            mutation PublishConfiguratorProduct($id: ID!, $input: [PublicationInput!]!) {
              publishablePublish(id: $id, input: $input) {
                userErrors { field message }
              }
            }
            GRAPHQL, [
            'id' => $productId,
            'input' => [['publicationId' => $publication['id']]],
        ]);
        $this->payload($publish, 'publishablePublish');
    }

    private function updateLocalMirror(
        ConfiguratorProduct $product,
        User $store,
        array $shopifyProduct,
        array $variant,
    ): void {
        $mirror = ShopifyProduct::query()->updateOrCreate([
            'user_id' => $store->id,
            'shopify_product_id' => $product->shopify_product_id,
        ], [
            'title' => $product->name,
            'handle' => $shopifyProduct['handle'] ?? $product->slug,
            'body_html' => nl2br(e((string) $product->description)),
            'tags' => implode(',', $product->tags ?? []),
            'vendor' => config('app.name'),
            'product_type' => $product->category,
            'status' => $product->shopify_status,
        ]);
        $mirror->productVarients()->updateOrCreate([
            'shopify_product_varient_id' => $product->shopify_variant_id,
        ], [
            'shopify_inventory_item_id' => $product->shopify_inventory_item_id,
            'title' => $variant['title'] ?? 'Default Title',
            'sku' => $variant['sku'] ?? null,
            'price' => $product->price,
            'inventory_quantity' => $product->inventory_quantity,
            'compare_at_price' => null,
        ]);
    }

    private function thumbnailInput(ConfiguratorProduct $product): ?array
    {
        $source = $product->thumbnail_path
            ? Storage::disk('public')->url($product->thumbnail_path)
            : $product->thumbnail_url;

        if (! $source) {
            return null;
        }

        if (str_starts_with($source, '//')) {
            $source = 'https:'.$source;
        } elseif (! Str::startsWith($source, ['http://', 'https://'])) {
            $source = rtrim((string) config('app.url'), '/').'/'.ltrim($source, '/');
        }

        return [
            'originalSource' => $source,
            'alt' => $product->name,
            'mediaContentType' => 'IMAGE',
        ];
    }

    private function thumbnailSourceKey(ConfiguratorProduct $product): ?string
    {
        return $product->thumbnail_path ?: $product->thumbnail_url;
    }

    private function latestImageMediaId(array $shopifyProduct): ?string
    {
        $media = collect(Arr::get($shopifyProduct, 'media.nodes', []))
            ->filter(fn ($item) => is_array($item) && ($item['mediaContentType'] ?? null) === 'IMAGE')
            ->last();

        return is_array($media) ? ($media['id'] ?? null) : null;
    }

    private function deleteProductMedia(User $store, string $productId, string $mediaId): void
    {
        $data = $this->graph($store, <<<'GRAPHQL'
            mutation DeleteReplacedConfiguratorThumbnail($productId: ID!, $mediaIds: [ID!]!) {
              productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
                deletedMediaIds
                mediaUserErrors { field message }
              }
            }
            GRAPHQL, ['productId' => $productId, 'mediaIds' => [$mediaId]]);
        $errors = Arr::get($data, 'productDeleteMedia.mediaUserErrors', []);
        if ($errors) {
            $this->fail(implode(' ', array_map(
                fn ($error) => $error['message'] ?? 'Shopify could not replace the product thumbnail.',
                $errors,
            )));
        }
    }

    private function prioritizeProductMedia(User $store, string $productId, string $mediaId): void
    {
        $data = $this->graph($store, <<<'GRAPHQL'
            mutation PrioritizeConfiguratorThumbnail($productId: ID!, $moves: [MoveInput!]!) {
              productReorderMedia(id: $productId, moves: $moves) {
                job { id }
                mediaUserErrors { field message }
              }
            }
            GRAPHQL, [
            'productId' => $productId,
            'moves' => [['id' => $mediaId, 'newPosition' => '0']],
        ]);
        $errors = Arr::get($data, 'productReorderMedia.mediaUserErrors', []);
        if ($errors) {
            $this->fail(implode(' ', array_map(
                fn ($error) => $error['message'] ?? 'Shopify could not feature the product thumbnail.',
                $errors,
            )));
        }
    }

    private function productInput(ConfiguratorProduct $product): array
    {
        return [
            'title' => $product->name,
            'category' => self::CLOTHING_CATEGORY_ID,
            'descriptionHtml' => nl2br(e((string) $product->description)),
            'productType' => $product->category,
            'vendor' => config('app.name'),
            'status' => strtoupper($product->shopify_status),
            'tags' => $product->tags ?? [],
        ];
    }

    protected function graph(User $store, string $query, array $variables = []): array
    {
        try {
            $response = $store->api()->graph($query, $variables);
        } catch (Throwable $exception) {
            $this->fail('Shopify could not be reached: '.$exception->getMessage());
        }

        if (($response['errors'] ?? false) !== false) {
            $errors = $response['errors'];
            $message = is_array($errors)
                ? implode(' ', array_filter(array_map(fn ($error) => $error['message'] ?? null, $errors)))
                : 'Shopify rejected the request.';
            $this->fail($message ?: 'Shopify rejected the request.');
        }

        $body = json_decode(json_encode($response['body'] ?? []), true);

        return $body['data'] ?? [];
    }

    private function payload(array $data, string $key, ?string $resource = null): array
    {
        $payload = $data[$key] ?? [];
        $errors = $payload['userErrors'] ?? [];
        if ($errors) {
            $this->fail(implode(' ', array_map(fn ($error) => $error['message'] ?? 'Shopify rejected the change.', $errors)));
        }

        if ($resource !== null) {
            $value = $payload[$resource] ?? null;
            if (! is_array($value)) {
                $this->fail('Shopify returned an incomplete product response.');
            }

            return $value;
        }

        return $payload;
    }

    private function legacyId(array $node): int
    {
        $id = $node['legacyResourceId'] ?? Str::afterLast((string) ($node['id'] ?? ''), '/');
        if (! is_numeric($id)) {
            $this->fail('Shopify returned an invalid resource ID.');
        }

        return (int) $id;
    }

    private function gid(string $type, int|string $id): string
    {
        return str_starts_with((string) $id, 'gid://') ? (string) $id : "gid://shopify/{$type}/{$id}";
    }

    private function idempotencyKey(
        string $operation,
        ConfiguratorProduct $product,
        string $inventoryItemId,
        string $locationId,
    ): string {
        return hash('sha256', implode(':', [
            $operation,
            $product->id,
            $product->updated_at?->getTimestampMs(),
            $product->inventory_quantity,
            $inventoryItemId,
            $locationId,
        ]));
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages([
            'shopify' => 'Shopify sync failed: '.trim($message),
        ]);
    }
}
