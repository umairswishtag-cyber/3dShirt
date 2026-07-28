<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChatbotAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_owner_can_request_chatbot_activation(): void
    {
        $store = User::factory()->create();

        $this->actingAs($store)
            ->get(route('admin.chatbot.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Chatbot/Access')
                ->where('canManageAccess', false)
                ->where('store.assistant.status', 'inactive')
            );

        $this->post(route('admin.chatbot.request'))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('chatbot_settings', [
            'user_id' => $store->id,
            'is_enabled' => false,
            'position' => 'bottom-right',
            'reviewed_at' => null,
        ]);
    }

    public function test_platform_admin_can_enable_and_position_a_store_chatbot(): void
    {
        $admin = User::factory()->create(['is_platform_admin' => true]);
        $store = User::factory()->create();
        $store->chatbotSetting()->create([
            'requested_at' => now(),
            'position' => 'bottom-right',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.chatbot.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Chatbot/Access')
                ->where('canManageAccess', true)
                ->where('summary.pending', 1)
                ->has('stores', 1)
            );

        $this->patch(route('admin.chatbot.update', $store), [
            'is_enabled' => true,
            'position' => 'top-left',
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('chatbot_settings', [
            'user_id' => $store->id,
            'is_enabled' => true,
            'position' => 'top-left',
            'activated_by' => $admin->id,
        ]);
        $this->assertNotNull($store->chatbotSetting()->firstOrFail()->reviewed_at);
    }

    public function test_store_owner_cannot_change_chatbot_entitlements(): void
    {
        $store = User::factory()->create();
        $otherStore = User::factory()->create();

        $this->actingAs($store)
            ->patch(route('admin.chatbot.update', $otherStore), [
                'is_enabled' => true,
                'position' => 'top-right',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('chatbot_settings', [
            'user_id' => $otherStore->id,
            'is_enabled' => true,
        ]);
    }

    public function test_enabled_owner_chatbot_reaches_storefront_as_safe_configuration_only(): void
    {
        $store = User::factory()->create();
        $store->chatbotSetting()->create([
            'is_enabled' => true,
            'position' => 'bottom-left',
            'activated_at' => now(),
        ]);
        ConfiguratorProduct::query()->create([
            'user_id' => $store->id,
            'name' => 'Chat Shirt',
            'slug' => 'chat-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => '/models/chat-shirt.glb',
            'color_zones' => [['id' => 'body', 'label' => 'Body']],
            'is_published' => true,
        ]);

        $this->getJson(route('configurator.catalog'))
            ->assertOk()
            ->assertJsonPath('data.0.assistant.enabled', true)
            ->assertJsonPath('data.0.assistant.position', 'bottom-left')
            ->assertJsonMissing(['email' => $store->email])
            ->assertJsonMissingPath('data.0.assistant.activated_at')
            ->assertJsonMissingPath('data.0.assistant.activated_by');
    }

    public function test_platform_admin_bootstrap_command_creates_a_separate_secure_account(): void
    {
        $this->artisan('app:make-platform-admin', [
            'email' => 'platform@example.com',
            '--name' => 'Platform Owner',
            '--password' => 'Strong-Local-Admin-2026!',
        ])->assertSuccessful();

        $admin = User::query()->where('email', 'platform@example.com')->firstOrFail();

        $this->assertTrue($admin->is_platform_admin);
        $this->assertTrue(Hash::check('Strong-Local-Admin-2026!', $admin->password));
        $this->assertTrue($admin->isPlatformAdmin());
    }
}
