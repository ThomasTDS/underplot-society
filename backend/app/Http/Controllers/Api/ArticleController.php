<?php

namespace App\Http\Controllers\Api;

use App\Enums\Locale;
use App\Http\Controllers\Controller;
use App\Http\Requests\ListArticlesRequest;
use App\Http\Resources\ArticleResource;
use App\Http\Resources\ArticleSummaryResource;
use App\Models\ArticleTranslation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;

/**
 * Read-only access to published articles. Drafts and scheduled translations never
 * leave this controller: every query goes through ArticleTranslation::visible().
 */
class ArticleController extends Controller
{
    public function index(ListArticlesRequest $request, string $locale): JsonResponse
    {
        $language = Locale::from($locale);

        $page = $this->visibleIn($language)
            ->when($request->area(), fn (Builder $query, string $area) => $query->whereHas(
                'article.area.translations',
                fn (Builder $q) => $q->where('locale', $language)->where('slug', $area),
            ))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate(perPage: $request->perPage(), page: $request->page());

        return response()->json([
            'data' => ArticleSummaryResource::collection($page->items())->resolve($request),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function show(string $locale, string $slug): ArticleResource
    {
        $language = Locale::from($locale);

        $translation = $this->visibleIn($language)
            ->where('slug', $slug)
            ->with(['article.translations' => fn (HasMany $q) => $q->visible()])
            ->firstOrFail();

        return new ArticleResource($translation);
    }

    /**
     * Visible translations in one language, with the area name and the cover's
     * alternative text in that same language.
     *
     * @return Builder<ArticleTranslation>
     */
    private function visibleIn(Locale $language): Builder
    {
        $sameLanguage = fn (HasMany $q) => $q->where('locale', $language);

        return ArticleTranslation::query()
            ->visible()
            ->inLocale($language)
            ->with([
                'article.area.translations' => $sameLanguage,
                'article.cover.translations' => $sameLanguage,
            ]);
    }
}
