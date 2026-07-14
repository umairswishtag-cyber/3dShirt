<?php

namespace App\Services\Configurator;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ConfiguratorAssetStorageService
{
    public function storeModel(UploadedFile $file): string
    {
        return $file->store('configurator/models', 'public');
    }

    public function storeThumbnail(UploadedFile $file): string
    {
        return $file->store('configurator/thumbnails', 'public');
    }

    public function storeSanitizedPattern(string $svg, string $filename): string
    {
        $path = 'configurator/patterns/'.uniqid('', true).'-'.$filename;
        Storage::disk('public')->put($path, $svg);

        return $path;
    }

    public function publicUrl(?string $path, ?string $legacyUrl = null): ?string
    {
        if ($path) {
            if (config('filesystems.disks.public.driver') === 'local') {
                return '/storage/'.ltrim($path, '/');
            }

            return Storage::disk('public')->url($path);
        }

        return $legacyUrl;
    }

    public function delete(?string $path): void
    {
        if ($path && str_starts_with($path, 'configurator/')) {
            Storage::disk('public')->delete($path);
        }
    }
}
