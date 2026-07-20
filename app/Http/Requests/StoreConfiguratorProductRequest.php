<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
        $this->merge($decoded);
    }

    public function rules(): array
    {
        $creating = $this->routeIs('admin.configurator.products.store');

        return [
            'name' => ['required', 'string', 'max:160'],
            'gender' => ['required', Rule::exists('configurator_taxonomies', 'slug')->where('type', 'audience')],
            'category' => ['required', Rule::exists('configurator_taxonomies', 'slug')->where('type', 'category')],
            'description' => ['nullable', 'string', 'max:1000'],
            'fit_height' => ['required', 'numeric', 'min:0.1', 'max:20'],
            'model' => [$creating ? 'required' : 'nullable', 'file', 'max:102400'],
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'pattern_name' => ['nullable', 'required_with:pattern_svg', 'string', 'max:120'],
            'pattern_svg' => ['nullable', 'file', 'max:2048'],
            'pattern_is_active' => ['nullable', 'boolean'],
            'mesh_zones' => ['required', 'array'],
            'mesh_zones.*' => ['string', 'max:64'],
            'print_areas' => ['array', 'max:30'],
            'print_areas.*.label' => ['nullable', 'string', 'max:80'],
            'print_areas.*.cameraView' => ['nullable', 'in:front,back,left,right'],
            'print_areas.*.meshName' => ['required', 'string', 'max:160'],
            'print_areas.*.outwardNormalZ' => ['nullable', 'numeric', 'between:-1,1'],
            'print_areas.*.uvBounds' => ['required', 'array'],
            'print_areas.*.uvBounds.min' => ['required', 'array', 'size:2'],
            'print_areas.*.uvBounds.min.*' => ['numeric'],
            'print_areas.*.uvBounds.max' => ['required', 'array', 'size:2'],
            'print_areas.*.uvBounds.max.*' => ['numeric'],
            'print_areas.*.projection' => ['nullable', 'array'],
            'print_areas.*.projection.type' => ['required_with:print_areas.*.projection', 'in:planar,box'],
            'print_areas.*.projection.axis' => ['nullable', 'in:x,y,z'],
            'print_areas.*.projection.direction' => ['nullable', 'integer', 'in:-1,1'],
            'print_areas.*.logoBounds' => ['nullable', 'array:x,y,width,height'],
            'print_areas.*.logoBounds.x' => ['required_with:print_areas.*.logoBounds', 'numeric', 'between:0,1'],
            'print_areas.*.logoBounds.y' => ['required_with:print_areas.*.logoBounds', 'numeric', 'between:0,1'],
            'print_areas.*.logoBounds.width' => ['required_with:print_areas.*.logoBounds', 'numeric', 'gt:0', 'max:1'],
            'print_areas.*.logoBounds.height' => ['required_with:print_areas.*.logoBounds', 'numeric', 'gt:0', 'max:1'],
            'print_areas.*.logoProjection' => ['nullable', 'array'],
            'print_areas.*.logoProjection.type' => ['required_with:print_areas.*.logoProjection', 'in:planar'],
            'print_areas.*.logoProjection.axis' => ['required_with:print_areas.*.logoProjection', 'in:x,y,z'],
            'print_areas.*.logoProjection.direction' => ['required_with:print_areas.*.logoProjection', 'integer', 'in:-1,1'],
            'print_areas.*.logoPlacement' => ['nullable', 'array:type,origin,uAxis,vAxis,normal,width,height'],
            'print_areas.*.logoPlacement.type' => ['required_with:print_areas.*.logoPlacement', 'in:surface'],
            'print_areas.*.logoPlacement.origin' => ['required_with:print_areas.*.logoPlacement', 'array', 'size:3'],
            'print_areas.*.logoPlacement.origin.*' => ['numeric'],
            'print_areas.*.logoPlacement.uAxis' => ['required_with:print_areas.*.logoPlacement', 'array', 'size:3'],
            'print_areas.*.logoPlacement.uAxis.*' => ['numeric', 'between:-1,1'],
            'print_areas.*.logoPlacement.vAxis' => ['required_with:print_areas.*.logoPlacement', 'array', 'size:3'],
            'print_areas.*.logoPlacement.vAxis.*' => ['numeric', 'between:-1,1'],
            'print_areas.*.logoPlacement.normal' => ['required_with:print_areas.*.logoPlacement', 'array', 'size:3'],
            'print_areas.*.logoPlacement.normal.*' => ['numeric', 'between:-1,1'],
            'print_areas.*.logoPlacement.width' => ['required_with:print_areas.*.logoPlacement', 'numeric', 'gt:0', 'max:100000'],
            'print_areas.*.logoPlacement.height' => ['required_with:print_areas.*.logoPlacement', 'numeric', 'gt:0', 'max:100000'],
            'color_zones' => ['required_if:supports_colors,true', 'array'],
            'color_zones.*.id' => ['required_with:color_zones', 'string', 'max:64', 'regex:/^[A-Za-z][A-Za-z0-9_-]*$/'],
            'color_zones.*.label' => ['required_with:color_zones', 'string', 'max:80'],
            'color_zones.*.defaultColor' => ['required_with:color_zones', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'allowed_colors' => ['required', 'array'],
            'allowed_colors.*' => ['regex:/^#[0-9A-Fa-f]{6}$/'],
            'pattern_zones' => ['array'],
            'pattern_zones.*' => ['string', 'max:64', 'regex:/^[A-Za-z][A-Za-z0-9_-]*$/'],
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
                $validator->errors()->add('print_areas', 'Choose at least one model area where customers can add patterns or logos. You can still save without it as a draft.');
            }

            if ($this->boolean('is_published') && $this->boolean('supports_logos')) {
                $hasLogoReadyArea = collect($this->input('print_areas', []) ?? [])->contains(
                    fn ($area) => is_array($area)
                        && (($area['logoPlacement']['type'] ?? null) === 'surface'
                        || (! array_key_exists('label', $area) && (
                            ($area['projection']['type'] ?? null) !== 'box'
                            || ($area['logoProjection']['type'] ?? null) === 'planar'
                        ))
                        )
                );

                if (! $hasLogoReadyArea) {
                    $validator->errors()->add('print_areas', 'Draw a logo-safe zone on at least one model face before publishing logo placement.');
                }
            }

            if (
                $this->boolean('is_published') &&
                $this->boolean('supports_colors') &&
                empty($this->input('mesh_zones'))
            ) {
                $validator->errors()->add('mesh_zones', 'Connect at least one part of the 3D model to a solid color option before publishing.');
            }

            if (
                $this->boolean('is_published') &&
                $this->boolean('supports_patterns') &&
                (
                    ($this->route('product') && ! $this->route('product')->patterns()->where('is_active', true)->exists()) ||
                    (! $this->route('product') && (! $this->hasFile('pattern_svg') || ! $this->boolean('pattern_is_active')))
                )
            ) {
                $validator->errors()->add('is_published', 'Upload or activate at least one SVG pattern before publishing with patterns enabled.');
            }

            if ($this->boolean('is_published') && $this->boolean('supports_patterns')) {
                $printAreas = $this->input('print_areas', []) ?? [];
                $patternZones = $this->input('pattern_zones', []) ?? [];

                if (empty($patternZones)) {
                    $validator->errors()->add('pattern_zones', 'Choose at least one model area where customers can apply patterns.');
                }

                foreach ($patternZones as $patternZone) {
                    if (! array_key_exists($patternZone, $printAreas)) {
                        $validator->errors()->add('pattern_zones', "Review the {$patternZone} artwork area before publishing.");
                    }
                }
            }

            foreach ($this->input('print_areas', []) ?? [] as $areaId => $printArea) {
                if (! is_string($areaId) || ! preg_match('/^[A-Za-z][A-Za-z0-9_-]{0,63}$/', $areaId)) {
                    $validator->errors()->add('print_areas', 'Artwork area identifiers must start with a letter and contain only letters, numbers, dashes, or underscores.');
                }

                if (! is_array($printArea)) {
                    continue;
                }

                $bounds = $printArea['logoBounds'] ?? null;
                if (! is_array($bounds)) {
                    continue;
                }

                if (($bounds['x'] ?? 0) + ($bounds['width'] ?? 0) > 1) {
                    $validator->errors()->add("print_areas.{$areaId}.logoBounds.width", 'The logo zone must stay inside the model texture width.');
                }
                if (($bounds['y'] ?? 0) + ($bounds['height'] ?? 0) > 1) {
                    $validator->errors()->add("print_areas.{$areaId}.logoBounds.height", 'The logo zone must stay inside the model texture height.');
                }
            }

            $zoneIds = collect($this->input('color_zones', []))->pluck('id')->filter();
            foreach ($this->input('mesh_zones', []) ?? [] as $mesh => $zoneId) {
                if (! $zoneIds->contains($zoneId)) {
                    $validator->errors()->add('mesh_zones', "The model part {$mesh} is connected to a color option that no longer exists.");
                }
            }

            if ($this->boolean('is_published') && $this->boolean('supports_colors')) {
                $connectedZoneIds = collect($this->input('mesh_zones', []) ?? [])->values()->unique();
                foreach ($zoneIds->diff($connectedZoneIds) as $unusedZoneId) {
                    $validator->errors()->add('color_zones', "The color option {$unusedZoneId} is not connected to the 3D model. Connect it or remove it before publishing.");
                }
            }

            if ($this->boolean('is_published') && ! $this->hasFile('model') && ! $this->route('product')?->model_path && ! $this->route('product')?->model_url) {
                $validator->errors()->add('is_published', 'A GLB model is required before publishing.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'mesh_zones.array' => 'Mesh mappings must be valid JSON object data.',
            'print_areas.array' => 'Print-area bindings must be valid JSON object data.',
            'color_zones.array' => 'Color zones must be valid JSON array data.',
            'allowed_colors.array' => 'Allowed colors must be valid JSON array data.',
            'pattern_zones.array' => 'Pattern areas must be valid JSON array data.',
        ];
    }
}
