<?php

namespace Tests\Feature\Admin;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Filament\Resources\Articles\Pages\CreateArticle;
use App\Filament\Resources\Articles\Pages\EditArticle;
use App\Filament\Resources\Articles\Pages\ListArticles;
use App\Models\Area;
use App\Models\AreaTranslation;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Models\User;
use Closure;
use Filament\Actions\Testing\TestAction;
use Filament\Forms\Components\Repeater;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The acceptance of item 6.1: create, edit, publish and unpublish an article in the
 * three languages, through the panel, and see the effect on the public API.
 */
class ArticleAuthoringTest extends TestCase
{
    use RefreshDatabase;

    private Area $area;

    private Closure $undoRepeaterFake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->freezeSecond();
        $this->undoRepeaterFake = Repeater::fake();
        $this->actingAs(User::factory()->create());

        $this->area = AreaTranslation::factory()->create(['locale' => Locale::En, 'name' => 'Design', 'slug' => 'design'])->area;
    }

    protected function tearDown(): void
    {
        ($this->undoRepeaterFake)();
        parent::tearDown();
    }

    public function test_an_article_is_created_in_the_three_languages_as_a_draft(): void
    {
        Livewire::test(CreateArticle::class)
            ->fillForm($this->formData())
            ->call('create')
            ->assertHasNoFormErrors();

        $article = Article::sole();
        $this->assertSame($this->area->id, $article->area_id);
        $this->assertSame([], $article->missingLocales());
        $this->assertSame(
            ['beneath-the-surface', 'sob-a-superficie', 'bajo-la-superficie'],
            $article->translations()->orderBy('id')->pluck('slug')->all(),
        );
        $this->assertSame(3, $article->translations()->where('status', PublicationStatus::Draft)->count());

        $this->getJson('/api/v1/en/articles')->assertJsonPath('meta.total', 0);
    }

    public function test_an_article_is_edited(): void
    {
        $article = $this->articleInThreeLanguages();

        $form = Livewire::test(EditArticle::class, ['record' => $article->getRouteKey()]);
        $state = $form->get('data.translations');
        $this->assertIsArray($state);
        $this->assertCount(3, $state);

        $ptKey = collect($state)->search(fn (array $item) => $item['locale'] === 'pt-br');
        $this->assertNotFalse($ptKey);

        $form->set("data.translations.$ptKey.title", 'Sob a superfície, revisto')
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame('Sob a superfície, revisto', $article->translations()->where('locale', 'pt-br')->value('title'));
    }

    public function test_an_article_is_published_and_unpublished_in_the_three_languages(): void
    {
        $article = $this->articleInThreeLanguages();

        Livewire::test(ListArticles::class)
            ->callAction(TestAction::make('publish')->table($article))
            ->assertNotified('Published');

        foreach (['en' => 'beneath-the-surface', 'pt-br' => 'sob-a-superficie', 'es' => 'bajo-la-superficie'] as $locale => $slug) {
            $this->getJson("/api/v1/$locale/articles/$slug")->assertOk();
        }

        Livewire::test(ListArticles::class)
            ->callAction(TestAction::make('unpublish')->table($article))
            ->assertNotified('Unpublished');

        foreach (['en' => 'beneath-the-surface', 'pt-br' => 'sob-a-superficie', 'es' => 'bajo-la-superficie'] as $locale => $slug) {
            $this->getJson("/api/v1/$locale/articles/$slug")->assertNotFound();
        }
    }

    public function test_an_article_is_scheduled(): void
    {
        $article = $this->articleInThreeLanguages();

        Livewire::test(ListArticles::class)
            ->callAction(TestAction::make('publish')->table($article), data: ['at' => now()->addDay()->toDateTimeString()])
            ->assertNotified('Scheduled');

        $this->getJson('/api/v1/es/articles/bajo-la-superficie')->assertNotFound();

        $this->travel(1)->days();

        $this->getJson('/api/v1/es/articles/bajo-la-superficie')->assertOk();
    }

    public function test_an_article_missing_a_language_is_not_published(): void
    {
        $article = Article::factory()->for($this->area)->create();
        ArticleTranslation::factory()->for($article)->create(['locale' => Locale::En]);

        Livewire::test(ListArticles::class)
            ->callAction(TestAction::make('publish')->table($article))
            ->assertNotified('Not published');

        $this->assertSame(0, ArticleTranslation::where('status', PublicationStatus::Published)->count());
    }

    public function test_a_translation_published_in_the_form_without_a_date_is_published_now(): void
    {
        $data = $this->formData();
        $data['translations'][0]['status'] = PublicationStatus::Published->value;

        Livewire::test(CreateArticle::class)->fillForm($data)->call('create')->assertHasNoFormErrors();

        $this->getJson('/api/v1/en/articles/beneath-the-surface')
            ->assertOk()
            ->assertJsonPath('data.published_at', now()->toIso8601String());
        $this->getJson('/api/v1/pt-br/articles/sob-a-superficie')->assertNotFound();
    }

    public function test_a_slug_already_used_in_the_same_language_is_refused(): void
    {
        ArticleTranslation::factory()->create(['locale' => Locale::En, 'slug' => 'beneath-the-surface']);

        Livewire::test(CreateArticle::class)
            ->fillForm($this->formData())
            ->call('create')
            ->assertHasFormErrors(['translations.0.slug' => 'unique']);
    }

    public function test_a_slug_used_in_another_language_is_accepted(): void
    {
        ArticleTranslation::factory()->create(['locale' => Locale::Es, 'slug' => 'beneath-the-surface']);

        Livewire::test(CreateArticle::class)
            ->fillForm($this->formData())
            ->call('create')
            ->assertHasNoFormErrors();
    }

    public function test_a_malformed_slug_is_refused(): void
    {
        $data = $this->formData();
        $data['translations'][1]['slug'] = 'Sob a Superfície';

        Livewire::test(CreateArticle::class)
            ->fillForm($data)
            ->call('create')
            ->assertHasFormErrors(['translations.1.slug' => 'regex']);

        $this->assertSame(0, Article::count());
    }

    public function test_required_fields_are_enforced_in_every_language(): void
    {
        $data = $this->formData();
        $data['translations'][2]['title'] = '';
        $data['translations'][2]['body'] = '';

        Livewire::test(CreateArticle::class)
            ->fillForm($data)
            ->call('create')
            ->assertHasFormErrors(['translations.2.title' => 'required', 'translations.2.body' => 'required']);
    }

    /**
     * @return array{area_id: int, translations: list<array<string, string>>}
     */
    private function formData(): array
    {
        $translation = fn (Locale $locale, string $title, string $slug) => [
            'locale' => $locale->value,
            'title' => $title,
            'slug' => $slug,
            'summary' => "Summary: $title",
            'body' => "# $title\n\nBody.",
            'status' => PublicationStatus::Draft->value,
        ];

        return [
            'area_id' => $this->area->id,
            'translations' => [
                $translation(Locale::En, 'Beneath the Surface', 'beneath-the-surface'),
                $translation(Locale::PtBr, 'Sob a superfície', 'sob-a-superficie'),
                $translation(Locale::Es, 'Bajo la superficie', 'bajo-la-superficie'),
            ],
        ];
    }

    private function articleInThreeLanguages(): Article
    {
        $article = Article::factory()->for($this->area)->create();

        foreach ($this->formData()['translations'] as $data) {
            ArticleTranslation::factory()->for($article)->create($data);
        }

        return $article;
    }
}
