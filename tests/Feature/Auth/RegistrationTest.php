<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_registration_screen_is_public(): void
    {
        $response = $this->get('/register');

        $response->assertOk()->assertInertia(fn ($page) => $page->component('Customer/Auth/Register'));
    }

    public function test_public_visitors_cannot_create_admin_users(): void
    {
        $response = $this->post('/admin/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertNotFound();
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }
}
