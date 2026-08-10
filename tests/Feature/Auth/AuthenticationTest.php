<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/admin/login');

        $response->assertStatus(200)->assertInertia(
            fn ($page) => $page->component('Auth/Login'),
        );
    }

    public function test_browser_can_refresh_an_expired_csrf_token(): void
    {
        $response = $this->getJson('/csrf-token');

        $response
            ->assertOk()
            ->assertJsonPath('token', session()->token())
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_session_cookie_does_not_collide_with_other_laravel_apps(): void
    {
        $this->assertSame('shirt_configurator_session', config('session.cookie'));
    }

    public function test_login_screen_uses_https_routes_behind_a_reverse_proxy(): void
    {
        $response = $this
            ->withServerVariables([
                'HTTP_HOST' => 'umair.xoarhigh.info',
                'HTTP_X_FORWARDED_HOST' => 'umair.xoarhigh.info',
                'HTTP_X_FORWARDED_PORT' => '443',
                'HTTP_X_FORWARDED_PROTO' => 'https',
            ])
            ->get('/admin/login');

        $response
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('ziggy.url', 'https://umair.xoarhigh.info')
                ->where('ziggy.location', 'https://umair.xoarhigh.info/admin/login')
            )
            ->assertDontSee('http://umair.xoarhigh.info/admin/login', escape: false);
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/admin/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_store_admins_can_authenticate_using_the_login_screen(): void
    {
        $admin = User::factory()->create([
            'name' => 'store-admin.myshopify.com',
            'storefront_key' => 'store-admin.myshopify.com',
            'is_platform_admin' => false,
        ]);

        $response = $this->post('/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($admin);
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_platform_super_admins_can_authenticate_using_the_login_screen(): void
    {
        $admin = User::factory()->create(['is_platform_admin' => true]);

        $response = $this->post('/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($admin);
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/admin/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/admin/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }
}
