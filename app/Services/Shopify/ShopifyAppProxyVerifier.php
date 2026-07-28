<?php

namespace App\Services\Shopify;

use Illuminate\Http\Request;

class ShopifyAppProxyVerifier
{
    public function verify(Request $request): bool
    {
        $signature = (string) $request->query('signature', '');
        $secret = (string) config('shopify-app.api_secret');

        if ($signature === '' || $secret === '') {
            return false;
        }

        $parameters = $request->query();
        unset($parameters['signature']);
        ksort($parameters);

        $message = collect($parameters)
            ->map(fn (mixed $value, string $key): string => $key.'='.$this->stringValue($value))
            ->implode('');
        $calculated = hash_hmac('sha256', $message, $secret);

        if (! hash_equals($calculated, $signature)) {
            return false;
        }

        $timestamp = filter_var($parameters['timestamp'] ?? null, FILTER_VALIDATE_INT);

        return $timestamp !== false && abs(time() - $timestamp) <= 300;
    }

    private function stringValue(mixed $value): string
    {
        if (is_array($value)) {
            return implode(',', array_map(
                fn (mixed $item): string => (string) $item,
                $value,
            ));
        }

        return (string) $value;
    }
}

