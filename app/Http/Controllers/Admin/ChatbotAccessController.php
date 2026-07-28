<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatbotSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ChatbotAccessController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (! $user->isPlatformAdmin()) {
            return Inertia::render('Admin/Chatbot/Access', [
                'canManageAccess' => false,
                'store' => $this->storePayload($user->load('chatbotSetting')),
                'stores' => [],
                'summary' => null,
                'positions' => $this->positions(),
            ]);
        }

        $stores = User::query()
            ->where('is_platform_admin', false)
            ->with('chatbotSetting')
            ->withCount('configuratorProducts')
            ->orderBy('name')
            ->orderBy('email')
            ->get()
            ->map(fn (User $store) => $this->storePayload($store));

        return Inertia::render('Admin/Chatbot/Access', [
            'canManageAccess' => true,
            'store' => null,
            'stores' => $stores,
            'summary' => [
                'stores' => $stores->count(),
                'enabled' => $stores->where('assistant.enabled', true)->count(),
                'pending' => $stores->where('assistant.status', 'pending')->count(),
            ],
            'positions' => $this->positions(),
        ]);
    }

    public function requestAccess(Request $request): RedirectResponse
    {
        $setting = $request->user()->chatbotSetting()->firstOrCreate(
            [],
            ['position' => 'bottom-right'],
        );

        if (! $setting->is_enabled) {
            $setting->update([
                'requested_at' => now(),
                'reviewed_at' => null,
            ]);
        }

        return back()->with(
            'success',
            $setting->is_enabled
                ? 'Your customization assistant is already active.'
                : 'Activation request sent to the platform administrator.',
        );
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isPlatformAdmin(), 403);

        $data = $request->validate([
            'is_enabled' => ['required', 'boolean'],
            'position' => ['required', Rule::in(ChatbotSetting::POSITIONS)],
        ]);

        $setting = $user->chatbotSetting()->firstOrNew();
        $wasEnabled = (bool) $setting->is_enabled;
        $setting->fill([
            ...$data,
            'reviewed_at' => now(),
            'activated_at' => $data['is_enabled']
                ? ($setting->activated_at ?? now())
                : null,
            'activated_by' => $data['is_enabled'] ? $request->user()->id : null,
        ])->save();

        return back()->with('success', match (true) {
            ! $wasEnabled && $setting->is_enabled => "Chatbot activated for {$user->name}.",
            $wasEnabled && ! $setting->is_enabled => "Chatbot disabled for {$user->name}.",
            default => "Chatbot placement updated for {$user->name}.",
        });
    }

    /** @return array<string, mixed> */
    private function storePayload(User $user): array
    {
        $setting = $user->chatbotSetting;
        $enabled = (bool) $setting?->is_enabled;
        $pending = ! $enabled && $setting?->requested_at && ! $setting?->reviewed_at;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'productsCount' => $user->configurator_products_count ?? $user->configuratorProducts()->count(),
            'assistant' => [
                'enabled' => $enabled,
                'position' => $setting?->position ?? 'bottom-right',
                'status' => $enabled ? 'enabled' : ($pending ? 'pending' : 'inactive'),
                'requestedAt' => $setting?->requested_at?->toIso8601String(),
                'activatedAt' => $setting?->activated_at?->toIso8601String(),
            ],
        ];
    }

    /** @return array<int, array{value: string, label: string}> */
    private function positions(): array
    {
        return collect(ChatbotSetting::POSITIONS)
            ->map(fn (string $position) => [
                'value' => $position,
                'label' => str($position)->replace('-', ' ')->title()->toString(),
            ])
            ->all();
    }
}
