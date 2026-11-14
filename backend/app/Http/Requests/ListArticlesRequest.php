<?php

namespace App\Http\Requests;

use App\Models\ArticleTranslation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListArticlesRequest extends FormRequest
{
    public const DEFAULT_PER_PAGE = 12;

    public const MAX_PER_PAGE = 50;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'area' => [
                'sometimes', 'string', 'max:100', 'regex:'.ArticleTranslation::SLUG_PATTERN,
                Rule::exists('area_translations', 'slug')->where('locale', $this->route('locale')),
            ],
        ];
    }

    public function page(): int
    {
        return $this->integer('page', 1);
    }

    public function perPage(): int
    {
        return $this->integer('per_page', self::DEFAULT_PER_PAGE);
    }

    public function area(): ?string
    {
        return $this->has('area') ? $this->string('area')->toString() : null;
    }
}
