<?php

namespace App\Services\Configurator;

use DOMDocument;
use DOMElement;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SvgPatternService
{
    public function __construct(
        private readonly ConfiguratorAssetStorageService $storage,
    ) {}

    /** @return array{path: string, original_name: string, color_slots: array<int, array<string, string>>} */
    public function process(UploadedFile $file): array
    {
        $source = file_get_contents($file->getRealPath());
        if ($source === false || stripos($source, '<svg') === false) {
            throw new InvalidArgumentException('The uploaded file is not a valid SVG pattern.');
        }

        $cleanSvg = $this->sanitize($source);
        $colors = $this->extractColors($cleanSvg);
        $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)).'.svg';

        return [
            'path' => $this->storage->storeSanitizedPattern($cleanSvg, $safeName),
            'original_name' => $file->getClientOriginalName(),
            'color_slots' => array_map(
                fn (string $color, int $index) => [
                    'id' => 'color'.($index + 1),
                    'label' => 'Color '.($index + 1),
                    'source' => $color,
                ],
                $colors,
                array_keys($colors),
            ),
        ];
    }

    private function sanitize(string $source): string
    {
        $previous = libxml_use_internal_errors(true);
        $document = new DOMDocument;
        $loaded = $document->loadXML($source, LIBXML_NONET | LIBXML_NOBLANKS);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded || strtolower($document->documentElement?->localName ?? '') !== 'svg') {
            throw new InvalidArgumentException('The uploaded file is not a valid SVG pattern.');
        }

        $blockedElements = ['script', 'foreignObject', 'iframe', 'object', 'embed', 'audio', 'video'];
        foreach ($blockedElements as $tag) {
            $nodes = iterator_to_array($document->getElementsByTagName($tag));
            foreach ($nodes as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        foreach ($document->getElementsByTagName('style') as $style) {
            $style->nodeValue = preg_replace(
                ['/\@import\b[^;]*;?/i', '/url\s*\(\s*["\']?(?:https?:|\/\/|data:|javascript:)[^)]*\)/i'],
                '',
                $style->nodeValue ?? '',
            );
        }

        /** @var DOMElement $element */
        foreach ($document->getElementsByTagName('*') as $element) {
            foreach (iterator_to_array($element->attributes ?? []) as $attribute) {
                $name = strtolower($attribute->name);
                $value = trim($attribute->value);
                if (
                    str_starts_with($name, 'on') ||
                    in_array($name, ['href', 'xlink:href'], true) && preg_match('/^(?:https?:|\/\/|data:|javascript:)/i', $value) ||
                    preg_match('/url\s*\(\s*["\']?(?:https?:|\/\/|data:|javascript:)/i', $value)
                ) {
                    $element->removeAttributeNode($attribute);
                }
            }
        }

        return $document->saveXML($document->documentElement) ?: '';
    }

    /** @return array<int, string> */
    private function extractColors(string $source): array
    {
        preg_match_all('/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/', $source, $matches);
        $colors = [];

        foreach ($matches[0] as $color) {
            $normalized = strtoupper($color);
            if (strlen($normalized) === 4) {
                $normalized = '#'.$normalized[1].$normalized[1].$normalized[2].$normalized[2].$normalized[3].$normalized[3];
            }
            if (! in_array($normalized, $colors, true)) {
                $colors[] = $normalized;
            }
        }

        return array_slice($colors, 0, 12);
    }
}
