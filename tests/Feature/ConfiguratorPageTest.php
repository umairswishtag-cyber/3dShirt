<?php

namespace Tests\Feature;

use Tests\TestCase;

class ConfiguratorPageTest extends TestCase
{
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
