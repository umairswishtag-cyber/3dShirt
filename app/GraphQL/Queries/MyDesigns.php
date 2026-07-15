<?php

namespace App\GraphQL\Queries;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Services\Customer\CustomerDesignService;
use Illuminate\Database\Eloquent\Collection;

class MyDesigns
{
    use RequiresCustomer;

    public function __construct(private readonly CustomerDesignService $designs) {}

    /** @param array<string, mixed> $args
     * @return Collection<int, \App\Models\CustomerDesign>
     */
    public function __invoke(mixed $root, array $args): Collection
    {
        return $this->designs->allFor($this->customer());
    }
}
