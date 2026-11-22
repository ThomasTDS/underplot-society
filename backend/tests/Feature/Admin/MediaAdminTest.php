<?php

namespace Tests\Feature\Admin;

use App\Filament\Resources\Media\Pages\CreateMedia;
use App\Filament\Resources\Media\Pages\EditMedia;
use App\Filament\Resources\Media\Pages\ListMedia;
use App\Models\Media;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Acceptance of item 6.3 through the panel: a disguised file is refused, and an
 * upload without alternative text is refused.
 */
class MediaAdminTest extends TestCase
{
    use RefreshDatabase;

    private const ALT = ['en' => 'A raven', 'pt-br' => 'Um corvo', 'es' => 'Un cuervo'];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
        $this->actingAs(User::factory()->withTwoFactor()->create());
    }

    public function test_an_image_is_uploaded_with_its_alternative_texts(): void
    {
        Livewire::test(CreateMedia::class)
            ->fillForm(['file' => UploadedFile::fake()->image('cover.png', 1200, 630), 'alt' => self::ALT])
            ->call('create')
            ->assertHasNoFormErrors();

        $media = Media::sole();
        Storage::disk('public')->assertExists($media->path);
        $this->assertSame('Um corvo', $media->translations()->where('locale', 'pt-br')->value('alt_text'));
    }

    public function test_a_disguised_file_is_refused(): void
    {
        $script = UploadedFile::fake()->createWithContent('cover.jpg', '<?php system($_GET["c"]); ?>');

        Livewire::test(CreateMedia::class)
            ->fillForm(['file' => $script, 'alt' => self::ALT])
            ->call('create');

        $this->assertSame(0, Media::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_an_upload_without_alternative_text_is_refused(): void
    {
        Livewire::test(CreateMedia::class)
            ->fillForm(['file' => UploadedFile::fake()->image('cover.png'), 'alt' => ['en' => 'A raven', 'pt-br' => '', 'es' => 'Un cuervo']])
            ->call('create')
            ->assertHasFormErrors(['alt.pt-br' => 'required']);

        $this->assertSame(0, Media::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_alternative_texts_are_edited(): void
    {
        Livewire::test(CreateMedia::class)
            ->fillForm(['file' => UploadedFile::fake()->image('cover.png'), 'alt' => self::ALT])
            ->call('create');
        $media = Media::sole();

        Livewire::test(EditMedia::class, ['record' => $media->getRouteKey()])
            ->assertSchemaStateSet(['alt' => self::ALT])
            ->fillForm(['alt' => ['en' => 'A raven at night', 'pt-br' => 'Um corvo à noite', 'es' => 'Un cuervo de noche']])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame('Un cuervo de noche', $media->translations()->where('locale', 'es')->value('alt_text'));
    }

    public function test_the_images_page_lists_uploads(): void
    {
        $this->get('/admin/media')->assertOk();
    }

    public function test_the_images_page_gives_each_image_an_address_without_the_host(): void
    {
        Livewire::test(CreateMedia::class)
            ->fillForm(['file' => UploadedFile::fake()->image('cover.png', 1200, 630), 'alt' => self::ALT])
            ->call('create');
        $media = Media::sole();

        $this->assertSame('/storage/'.$media->path, $media->relativeUrl());
        Livewire::test(ListMedia::class)
            ->assertTableColumnStateSet('address', '/storage/'.$media->path, $media);
    }
}
