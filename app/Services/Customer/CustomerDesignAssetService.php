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

        if (! preg_match('/^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+\/=\r\n]+)$/', $data['dataUrl'], $matches)) {
            throw ValidationException::withMessages(['dataUrl' => 'Choose a valid SVG, PNG, JPEG, or WebP logo.']);
        }

        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]), true);
        if ($binary === false || strlen($binary) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['dataUrl' => 'Logo images must be 2 MB or smaller.']);
        }

        $uploadedMime = $matches[1];
        $extensions = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/svg+xml' => 'svg'];

        if ($uploadedMime === 'image/svg+xml') {
            $binary = $this->sanitizeSvg($binary);
        } else {
            $detectedMime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($binary);
            if (! isset($extensions[$detectedMime]) || $detectedMime !== $uploadedMime) {
                throw ValidationException::withMessages(['dataUrl' => 'The uploaded logo content does not match its image type.']);
            }
        }

        $path = sprintf(
            'customer-designs/%s/%s.%s',
            $customer->public_id,
            Str::uuid(),
            $extensions[$uploadedMime],
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

    private function sanitizeSvg(string $svg): string
    {
        if (preg_match('/<!DOCTYPE|<!ENTITY/i', $svg)) {
            throw ValidationException::withMessages(['dataUrl' => 'The SVG logo contains unsupported document declarations.']);
        }

        $previous = libxml_use_internal_errors(true);
        $document = new \DOMDocument;
        $loaded = $document->loadXML($svg, LIBXML_NONET | LIBXML_NOBLANKS);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded || strtolower($document->documentElement?->localName ?? '') !== 'svg') {
            throw ValidationException::withMessages(['dataUrl' => 'The selected file is not a valid SVG logo.']);
        }

        $blockedElements = [
            'script', 'foreignobject', 'iframe', 'object', 'embed', 'link', 'meta', 'audio', 'video',
            'animate', 'animatemotion', 'animatetransform', 'set', 'discard',
        ];
        $elements = [];
        foreach ($document->getElementsByTagName('*') as $element) {
            $elements[] = $element;
        }

        foreach ($elements as $element) {
            if (in_array(strtolower($element->localName), $blockedElements, true)) {
                $element->parentNode?->removeChild($element);
                continue;
            }

            if (strtolower($element->localName) === 'style' && $this->containsUnsafeSvgCss($element->textContent)) {
                $element->parentNode?->removeChild($element);
                continue;
            }

            $attributes = [];
            foreach ($element->attributes ?? [] as $attribute) {
                $attributes[] = $attribute;
            }

            foreach ($attributes as $attribute) {
                $name = strtolower($attribute->localName);
                $value = trim($attribute->value);

                if (str_starts_with($name, 'on')
                    || (in_array($name, ['href', 'src'], true) && ! $this->isSafeSvgReference($value))
                    || $this->containsUnsafeSvgCss($value)) {
                    $element->removeAttributeNode($attribute);
                }
            }
        }

        $sanitized = $document->saveXML($document->documentElement);
        if (! is_string($sanitized) || $sanitized === '') {
            throw ValidationException::withMessages(['dataUrl' => 'The SVG logo could not be sanitized.']);
        }

        return $sanitized;
    }

    private function isSafeSvgReference(string $value): bool
    {
        return $value === ''
            || str_starts_with($value, '#')
            || preg_match('/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\/=\r\n]+$/i', $value) === 1;
    }

    private function containsUnsafeSvgCss(string $css): bool
    {
        if (preg_match('/@import|expression\s*\(|javascript\s*:/i', $css)) {
            return true;
        }

        preg_match_all('/url\s*\(\s*([^)]+?)\s*\)/i', $css, $matches);
        foreach ($matches[1] as $reference) {
            if (! str_starts_with(trim($reference, " \t\n\r\0\x0B\"'"), '#')) {
                return true;
            }
        }

        return false;
    }
}
