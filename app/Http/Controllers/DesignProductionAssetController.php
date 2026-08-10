<?php

namespace App\Http\Controllers;

use App\Models\DesignCartItem;
use App\Services\Production\ProductionRequestWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DesignProductionAssetController extends Controller
{
    public function __construct(private readonly ProductionRequestWorkflow $workflow) {}

    public function store(Request $request): JsonResponse
    {
        $id = (string) $request->route('id');
        $customer = $request->attributes->get('shopify.customer')
            ?? Auth::guard('customer')->user();
        $item = DesignCartItem::query()
            ->where('public_id', $id)
            ->where('customer_id', $customer?->id)
            ->firstOrFail();
        abort_unless($item->status === 'prepared', 409, 'Production files have already been finalized.');

        $data = $request->validate([
            'final_model' => ['required', 'file', 'mimetypes:model/gltf-binary,application/octet-stream', 'max:153600'],
            'print_areas' => ['nullable', 'array', 'max:30'],
            'print_areas.*' => ['file', 'mimetypes:image/png', 'max:16384'],
            'print_area_ids' => ['nullable', 'array', 'max:30'],
            'print_area_ids.*' => ['string', 'distinct', 'regex:/^[A-Za-z][A-Za-z0-9_-]{0,63}$/'],
        ]);

        if (count($data['print_areas'] ?? []) !== count($data['print_area_ids'] ?? [])) {
            throw ValidationException::withMessages([
                'print_areas' => 'Every print file must include its matching area identifier.',
            ]);
        }
        $expectedAreaIds = array_keys($item->snapshot['product']['printAreas'] ?? []);
        $receivedAreaIds = $data['print_area_ids'] ?? [];
        sort($expectedAreaIds);
        sort($receivedAreaIds);
        if ($expectedAreaIds !== $receivedAreaIds) {
            throw ValidationException::withMessages([
                'print_areas' => 'Upload one production PNG for every configured print area.',
            ]);
        }

        $modelHandle = fopen($data['final_model']->getRealPath(), 'rb');
        $modelMagic = $modelHandle ? fread($modelHandle, 4) : false;
        if (is_resource($modelHandle)) {
            fclose($modelHandle);
        }
        if ($modelMagic !== 'glTF') {
            throw ValidationException::withMessages([
                'final_model' => 'The uploaded production model is not a valid binary GLB.',
            ]);
        }

        foreach ($data['print_areas'] ?? [] as $index => $file) {
            $dimensions = @getimagesize($file->getRealPath());
            if (($dimensions[0] ?? null) !== 2048 || ($dimensions[1] ?? null) !== 2048) {
                throw ValidationException::withMessages([
                    "print_areas.{$index}" => 'Print-area PNGs must be exactly 2048 × 2048 pixels.',
                ]);
            }
        }

        $directory = 'production-jobs/'.$item->public_id;
        $modelPath = $data['final_model']->storeAs($directory, 'final-model.glb', 'local');
        $printAreaPaths = [];

        foreach ($data['print_areas'] ?? [] as $index => $file) {
            $areaId = $data['print_area_ids'][$index];
            $printAreaPaths[$areaId] = $file->storeAs(
                $directory.'/print-areas',
                $areaId.'.png',
                'local',
            );
        }
        try {
            $logoPaths = $this->preserveLogos($item, $directory);
            $patternPath = $this->preservePattern($item, $directory);
        } catch (\Throwable $exception) {
            Storage::disk('local')->deleteDirectory($directory);
            throw $exception;
        }

        if (! $modelPath || collect($printAreaPaths)->contains(fn ($path) => ! $path)) {
            Storage::disk('local')->deleteDirectory($directory);
            throw ValidationException::withMessages([
                'final_model' => 'The production files could not be stored. Please try again.',
            ]);
        }

        $item->update([
            'final_model_path' => $modelPath,
            'print_area_paths' => $printAreaPaths,
            'logo_paths' => $logoPaths,
            'pattern_path' => $patternPath,
            'assets_uploaded_at' => now(),
        ]);
        $this->workflow->submit($item, $customer);

        return response()->json([
            'id' => $item->public_id,
            'status' => $item->status,
        ], 201, ['Cache-Control' => 'no-store, private']);
    }

    /** @return array<string, string> */
    private function preserveLogos(DesignCartItem $item, string $directory): array
    {
        $logos = collect($item->snapshot['design']['document']['designObjects'] ?? [])
            ->filter(fn (mixed $object): bool => is_array($object) && ($object['type'] ?? null) === 'image');
        $paths = [];

        foreach ($logos->values() as $index => $logo) {
            $sourcePath = $this->publicAssetPath((string) ($logo['source'] ?? ''));
            if (! $sourcePath
                || ! str_starts_with($sourcePath, 'customer-designs/'.$item->customer->public_id.'/')
                || ! Storage::disk('public')->exists($sourcePath)) {
                Storage::disk('local')->deleteDirectory($directory);
                throw ValidationException::withMessages([
                    'print_areas' => 'An original logo file is unavailable. Re-upload the logo and try again.',
                ]);
            }

            $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
            if (! in_array($extension, ['png', 'jpg', 'jpeg', 'webp', 'svg'], true)) {
                throw ValidationException::withMessages([
                    'print_areas' => 'An original logo has an unsupported file type.',
                ]);
            }
            $logoId = trim((string) preg_replace('/[^A-Za-z0-9_-]/', '-', (string) ($logo['id'] ?? 'logo')), '-');
            $logoId = $index.'-'.($logoId !== '' ? $logoId : 'logo');
            $destination = $directory.'/logos/'.$logoId.'.'.$extension;
            $this->copyPublicAsset($sourcePath, $destination);
            $paths[$logoId] = $destination;
        }

        return $paths;
    }

    private function preservePattern(DesignCartItem $item, string $directory): ?string
    {
        $patternId = $item->snapshot['design']['document']['selectedPatternId'] ?? null;
        if (! $patternId) {
            return null;
        }

        $pattern = collect($item->snapshot['product']['patterns'] ?? [])->firstWhere('id', $patternId);
        $sourcePath = is_array($pattern) ? ($pattern['sourcePath'] ?? null) : null;
        if (! is_string($sourcePath)
            || ! str_starts_with($sourcePath, 'configurator/')
            || ! Storage::disk('public')->exists($sourcePath)) {
            Storage::disk('local')->deleteDirectory($directory);
            throw ValidationException::withMessages([
                'print_areas' => 'The original SVG pattern is unavailable. Ask the store to restore it and try again.',
            ]);
        }

        $destination = $directory.'/pattern/source.svg';
        $this->copyPublicAsset($sourcePath, $destination);

        return $destination;
    }

    private function copyPublicAsset(string $source, string $destination): void
    {
        $stream = Storage::disk('public')->readStream($source);
        if (! is_resource($stream)) {
            throw ValidationException::withMessages([
                'print_areas' => 'A production source file could not be read.',
            ]);
        }

        try {
            if (! Storage::disk('local')->writeStream($destination, $stream)) {
                throw ValidationException::withMessages([
                    'print_areas' => 'A production source file could not be preserved.',
                ]);
            }
        } finally {
            fclose($stream);
        }
    }

    private function publicAssetPath(string $source): ?string
    {
        $path = rawurldecode((string) parse_url($source, PHP_URL_PATH));
        foreach (['/storage/', '/apps/configurator/assets/'] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return ltrim(substr($path, strlen($prefix)), '/');
            }
        }

        return null;
    }
}
