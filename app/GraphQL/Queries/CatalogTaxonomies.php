<?php

namespace App\GraphQL\Queries;

use App\Models\ConfiguratorTaxonomy;
use Illuminate\Database\Eloquent\Collection;

class CatalogTaxonomies
{
    /** @return Collection<int, ConfiguratorTaxonomy> */
    public function __invoke(): Collection
    {
        return ConfiguratorTaxonomy::query()
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();
    }
}
