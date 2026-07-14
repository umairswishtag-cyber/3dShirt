<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreConfiguratorProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $decoded = [];
        foreach (['mesh_zones', 'print_areas', 'color_zones', 'allowed_colors', 'pattern_zones'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $decoded[$field] = json_decode($value, true);
            }
        }
        if ($this->routeIs('admin.configurator.products.store')) {
            $decoded['is_published'] = false;
        }
        $this->merge($decoded);
    }

    public function rules(): array
    {
        $creating = $this->routeIs('admin.configurator.products.store');

        return [
            'name' => ['required', 'string', 'max:160'],
            'gender' => ['required', 'in:men,women,unisex,kids'],
            'category' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9-]+$/'],
            'description' => ['nullable', 'string', 'max:1000'],
            'fit_height' => ['required', 'numeric', 'min:0.1', 'max:20'],
            'model' => [$creating ? 'required' : 'nullable', 'file', 'max:102400'],
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'pattern_name' => ['nullable', 'required_with:pattern_svg', 'string', 'max:120'],
            'pattern_svg' => ['nullable', 'file', 'max:2048'],
            'pattern_is_active' => ['nullable', 'boolean'],
            'mesh_zones' => ['required', 'array'],
            'mesh_zones.*' => ['string', 'max:64'],
            'print_areas' => ['array:front,back,leftSleeve,rightSleeve'],
            'print_areas.*.meshName' => ['required', 'string', 'max:160'],
            'print_areas.*.outwardNormalZ' => ['nullable', 'numeric', 'between:-1,1'],
            'print_areas.*.uvBounds' => ['required', 'array'],
            'print_areas.*.uvBounds.min' => ['required', 'array', 'size:2'],
            'print_areas.*.uvBounds.min.*' => ['numeric'],
            'print_areas.*.uvBounds.max' => ['required', 'array', 'size:2'],
            'print_areas.*.uvBounds.max.*' => ['numeric'],
            'color_zones' => ['required_if:supports_colors,true', 'array'],
            'color_zones.*.id' => ['required_with:color_zones', 'string', 'max:64', 'regex:/^[A-Za-z][A-Za-z0-9_-]*$/'],
            'color_zones.*.label' => ['required_with:color_zones', 'string', 'max:80'],
            'color_zones.*.defaultColor' => ['required_with:color_zones', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'allowed_colors' => ['required', 'array'],
            'allowed_colors.*' => ['regex:/^#[0-9A-Fa-f]{6}$/'],
            'pattern_zones' => ['array'],
            'pattern_zones.*' => ['in:front,back,leftSleeve,rightSleeve'],
            'supports_colors' => ['required', 'boolean'],
            'supports_patterns' => ['required', 'boolean'],
            'supports_logos' => ['required', 'boolean'],
            'is_published' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->hasFile('model') && strtolower($this->file('model')->getClientOriginalExtension()) !== 'glb') {
                $validator->errors()->add('model', 'The model must be a .glb file.');
            }

            if ($this->hasFile('pattern_svg') && strtolower($this->file('pattern_svg')->getClientOriginalExtension()) !== 'svg') {
                $validator->errors()->add('pattern_svg', 'The initial pattern must be an .svg file.');
            }

            if ($this->hasFile('pattern_svg') && ! $this->boolean('supports_patterns')) {
                $validator->errors()->add('supports_patterns', 'Enable SVG patterns to upload an initial pattern.');
            }

            if (
                $this->boolean('is_published') &&
                ($this->boolean('supports_patterns') || $this->boolean('supports_logos')) &&
                empty($this->input('print_areas'))
            ) {
                $validator->errors()->add('print_areas', 'Add at least one print-area binding before publishing a product with patterns or logos. You can save it as a draft without bindings.');
            }

            $zoneIds = collect($this->input('color_zones', []))->pluck('id')->filter();
            foreach ($this->input('mesh_zones', []) ?? [] as $mesh => $zoneId) {
                if (! $zoneIds->contains($zoneId)) {
                    $validator->errors()->add('mesh_zones', "Mesh {$mesh} references unknown color zone {$zoneId}.");
                }
            }

            if ($this->boolean('is_published') && ! $this->hasFile('model') && ! $this->route('product')?->model_path && ! $this->route('product')?->model_url) {
                $validator->errors()->add('is_published', 'A GLB model is required before publishing.');
            }
        }];
    }
}
