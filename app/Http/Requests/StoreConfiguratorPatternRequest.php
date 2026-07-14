<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreConfiguratorPatternRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'svg' => ['required', 'file', 'max:2048'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->hasFile('svg') && strtolower($this->file('svg')->getClientOriginalExtension()) !== 'svg') {
                $validator->errors()->add('svg', 'The pattern must be an .svg file.');
            }
        }];
    }
}
