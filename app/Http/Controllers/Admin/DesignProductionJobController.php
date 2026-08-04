<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DesignCartItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DesignProductionJobController extends Controller
{
    public function show(Request $request, string $id): JsonResponse
    {
        $item = $this->itemForStore($request, $id);

        return response()->json([
            'id' => $item->public_id,
            'status' => $item->status,
            'quantity' => $item->quantity,
            'summary' => $item->summary,
            'snapshotSha256' => $item->snapshot_sha256,
            'snapshot' => $item->snapshot,
            'assets' => [
                'finalModel' => $item->final_model_path
                    ? route('admin.production-jobs.model', $item->public_id)
                    : null,
                'printAreas' => collect($item->print_area_paths ?? [])
                    ->mapWithKeys(fn (string $path, string $areaId) => [
                        $areaId => route('admin.production-jobs.print-area', [
                            'id' => $item->public_id,
                            'areaId' => $areaId,
                        ]),
                    ]),
                'logos' => collect($item->logo_paths ?? [])
                    ->mapWithKeys(fn (string $path, string $logoId) => [
                        $logoId => route('admin.production-jobs.logo', [
                            'id' => $item->public_id,
                            'logoId' => $logoId,
                        ]),
                    ]),
                'pattern' => $item->pattern_path
                    ? route('admin.production-jobs.pattern', $item->public_id)
                    : null,
            ],
            'orderedAt' => $item->ordered_at?->toIso8601String(),
            'createdAt' => $item->created_at?->toIso8601String(),
        ], 200, ['Cache-Control' => 'no-store, private']);
    }

    public function model(Request $request, string $id): StreamedResponse
    {
        $item = $this->itemForStore($request, $id);
        abort_unless($item->final_model_path && Storage::disk('local')->exists($item->final_model_path), 404);

        return Storage::disk('local')->download(
            $item->final_model_path,
            $item->public_id.'-final-model.glb',
            ['Content-Type' => 'model/gltf-binary'],
        );
    }

    public function printArea(Request $request, string $id, string $areaId): StreamedResponse
    {
        $item = $this->itemForStore($request, $id);
        $path = $item->print_area_paths[$areaId] ?? null;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download(
            $path,
            $item->public_id.'-'.$areaId.'.png',
            ['Content-Type' => 'image/png'],
        );
    }

    public function logo(Request $request, string $id, string $logoId): StreamedResponse
    {
        $item = $this->itemForStore($request, $id);
        $path = $item->logo_paths[$logoId] ?? null;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path, basename($path));
    }

    public function pattern(Request $request, string $id): StreamedResponse
    {
        $item = $this->itemForStore($request, $id);
        abort_unless($item->pattern_path && Storage::disk('local')->exists($item->pattern_path), 404);

        return Storage::disk('local')->download(
            $item->pattern_path,
            $item->public_id.'-pattern.svg',
            ['Content-Type' => 'image/svg+xml'],
        );
    }

    private function itemForStore(Request $request, string $id): DesignCartItem
    {
        return DesignCartItem::query()
            ->where('public_id', $id)
            ->when(
                ! $request->user()->isPlatformAdmin(),
                fn ($query) => $query->whereHas(
                    'customer',
                    fn ($customerQuery) => $customerQuery->where('user_id', $request->user()->id),
                ),
            )
            ->firstOrFail();
    }
}
