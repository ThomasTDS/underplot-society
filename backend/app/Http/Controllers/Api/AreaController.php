<?php

namespace App\Http\Controllers\Api;

use App\Enums\Locale;
use App\Http\Controllers\Controller;
use App\Http\Resources\AreaResource;
use App\Models\Area;
use Dedoc\Scramble\Attributes\Response as DocumentedResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;

/**
 * Areas for the article filter: only those with at least one article visible in the
 * language, so a filter never leads to an empty list.
 */
class AreaController extends Controller
{
    #[DocumentedResponse(429, 'Too many requests from this visitor; retry after the number of seconds in Retry-After.', type: 'array{message: string}')]
    public function index(Locale $locale): JsonResponse
    {
        $areas = Area::query()
            ->whereHas('articles.translations', fn (Builder $q) => $q->visible()->inLocale($locale))
            ->with(['translations' => fn (HasMany $q) => $q->where('locale', $locale)])
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(fn (Area $area) => AreaResource::forLanguage($area))
            ->filter()
            ->values();

        return response()->json(['data' => $areas]);
    }
}
