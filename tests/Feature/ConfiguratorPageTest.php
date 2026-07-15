<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfiguratorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_configurator_page_is_available(): void
    {
        $response = $this->get('/configurator');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Configurator/ConfiguratorPage')
            ->has('catalog')
        );
    }
}
