<?php

namespace App\Services\Customer;

use App\Models\Customer;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerDesignAssetService
{
    private const MAX_BYTES = 2 * 1024 * 1024;

    /** @param array<string, mixed> $input */
    public function store(Customer $customer, array $input): array
    {
        $data = Validator::make($input, [
            'name' => ['required', 'string', 'max:180'],
            'dataUrl' => ['required', 'string', 'max:3000000'],
        ])->validate();

        if (! preg_match('/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+\/=\r\n]+)$/', $data['dataUrl'], $matches)) {
            throw ValidationException::withMessages(['dataUrl' => 'Choose a valid PNG, JPEG, or WebP logo.']);
        }

        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]), true);
        if ($binary === false || strlen($binary) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['dataUrl' => 'Logo images must be 2 MB or smaller.']);
        }

        $detectedMime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($binary);
        $extensions = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
        if (! isset($extensions[$detectedMime]) || $detectedMime !== $matches[1]) {
            throw ValidationException::withMessages(['dataUrl' => 'The uploaded logo content does not match its image type.']);
        }

        $path = sprintf(
            'customer-designs/%s/%s.%s',
            $customer->public_id,
            Str::uuid(),
            $extensions[$detectedMime],
        );
        if (! Storage::disk('public')->put($path, $binary)) {
            throw ValidationException::withMessages(['dataUrl' => 'The logo could not be stored. Please try again.']);
        }

        return [
            'url' => config('filesystems.disks.public.driver') === 'local'
                ? '/storage/'.$path
                : Storage::disk('public')->url($path),
        ];
    }
}
