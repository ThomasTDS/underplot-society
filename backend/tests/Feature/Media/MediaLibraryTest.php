<?php

namespace Tests\Feature\Media;

use App\Media\InvalidMedia;
use App\Media\MediaLibrary;
use App\Models\Article;
use App\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    private const ALT = ['en' => 'A raven on a skull', 'pt-br' => 'Um corvo sobre um crânio', 'es' => 'Un cuervo sobre un cráneo'];

    private MediaLibrary $library;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->library = new MediaLibrary;
    }

    // Accepted images.

    /**
     * @return iterable<string, array{'jpeg'|'png'|'webp'}>
     */
    public static function acceptedFormats(): iterable
    {
        yield 'JPEG' => ['jpeg'];
        yield 'PNG' => ['png'];
        yield 'WebP' => ['webp'];
    }

    /**
     * @param  'jpeg'|'png'|'webp'  $format
     */
    #[DataProvider('acceptedFormats')]
    public function test_an_image_is_stored_as_webp_under_a_random_name(string $format): void
    {
        $media = $this->library->store($this->upload($this->image($format, 800, 600), "My Holiday Photo.$format"), self::ALT);

        $this->assertMatchesRegularExpression('#^media/[0-9a-f-]{36}\.webp$#', $media->path);
        $this->assertSame('image/webp', $media->mime_type);
        $this->assertSame([800, 600], [$media->width, $media->height]);

        $stored = (string) Storage::disk('public')->get($media->path);
        $this->assertSame(strlen($stored), $media->size_bytes);
        $this->assertSame('image/webp', (new \finfo(FILEINFO_MIME_TYPE))->buffer($stored));
    }

    public function test_alternative_text_is_saved_in_every_language(): void
    {
        $media = $this->library->store($this->upload($this->image('png')), self::ALT);

        $this->assertEquals(
            self::ALT,
            $media->translations()->get()->mapWithKeys(fn ($t) => [$t->locale->value => $t->alt_text])->all(),
        );
    }

    public function test_a_wide_image_is_scaled_down_to_2400_pixels(): void
    {
        $media = $this->library->store($this->upload($this->image('jpeg', 3000, 600)), self::ALT);

        $this->assertSame([2400, 480], [$media->width, $media->height]);
    }

    public function test_metadata_and_anything_appended_to_the_file_are_dropped(): void
    {
        $jpeg = $this->image('jpeg', 200, 100);
        // An APP1 segment right after the start-of-image marker, where cameras put EXIF
        // data such as the GPS position, plus a script appended after the image.
        $exif = "Exif\0\0GPS-LATITUDE-23.55-LONGITUDE-46.63";
        $withMetadata = substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($exif) + 2).$exif.substr($jpeg, 2);
        $polyglot = $withMetadata.'<?php system($_GET["c"]); ?>';

        $media = $this->library->store($this->upload($polyglot, 'photo.jpg'), self::ALT);

        $stored = (string) Storage::disk('public')->get($media->path);
        $this->assertStringNotContainsString('GPS-LATITUDE', $stored);
        $this->assertStringNotContainsString('<?php', $stored);
    }

    // Refused files.

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function disguisedFiles(): iterable
    {
        yield 'PHP script named .jpg' => ['<?php system($_GET["c"]); ?>', 'shell.jpg'];
        yield 'PHP script named .png.php' => ['<?php echo 1;', 'image.png.php'];
        yield 'HTML named .png' => ['<html><script>alert(1)</script></html>', 'page.png'];
        yield 'SVG with a script' => ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'logo.svg'];
        yield 'SVG named .webp' => ['<svg xmlns="http://www.w3.org/2000/svg"/>', 'logo.webp'];
        yield 'PDF named .jpg' => ["%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF", 'doc.jpg'];
        yield 'empty file' => ['', 'empty.jpg'];
        yield 'JPEG header only' => ["\xFF\xD8\xFF\xE0\x00\x10JFIF\x00", 'truncated.jpg'];
    }

    #[DataProvider('disguisedFiles')]
    public function test_a_file_that_is_not_an_accepted_image_is_refused(string $content, string $name): void
    {
        $this->assertRefused(fn () => $this->library->store($this->upload($content, $name), self::ALT));
    }

    public function test_a_gif_is_refused(): void
    {
        $this->assertRefused(fn () => $this->library->store($this->upload($this->image('gif'), 'anim.gif'), self::ALT), 'Only JPEG, PNG and WebP');
    }

    public function test_a_file_over_5_mb_is_refused(): void
    {
        $big = $this->image('png').str_repeat("\0", MediaLibrary::MAX_BYTES);

        $this->assertRefused(fn () => $this->library->store($this->upload($big), self::ALT), 'at most 5 MB');
    }

    public function test_an_image_over_16_megapixels_is_refused_before_decoding(): void
    {
        // A PNG header claiming 10000 × 10000 pixels; decoding it would take ~400 MB.
        $ihdr = pack('N2', 10000, 10000)."\x08\x06\x00\x00\x00";
        $png = "\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.$ihdr.pack('N', crc32('IHDR'.$ihdr));

        $this->assertRefused(fn () => $this->library->store($this->upload($png, 'huge.png'), self::ALT), '16 megapixels');
    }

    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function badAltTexts(): iterable
    {
        yield 'missing in Spanish' => [['en' => 'x', 'pt-br' => 'x'], 'Español is missing'];
        yield 'blank in Portuguese' => [['en' => 'x', 'pt-br' => '   ', 'es' => 'x'], 'Português (Brasil) is missing'];
        yield 'none at all' => [[], 'English is missing'];
        yield 'too long' => [['en' => str_repeat('a', 301), 'pt-br' => 'x', 'es' => 'x'], 'longer than 300'];
    }

    /**
     * @param  array<string, string>  $alt
     */
    #[DataProvider('badAltTexts')]
    public function test_an_image_without_alternative_text_in_every_language_is_refused(array $alt, string $message): void
    {
        $this->assertRefused(fn () => $this->library->store($this->upload($this->image('png')), $alt), $message);
    }

    // Changing and deleting.

    public function test_alternative_texts_are_updated_and_still_required(): void
    {
        $media = $this->library->store($this->upload($this->image('png')), self::ALT);

        $this->library->updateAltTexts($media, ['en' => 'New', 'pt-br' => 'Novo', 'es' => 'Nuevo']);
        $this->assertSame('Novo', $media->translations()->where('locale', 'pt-br')->value('alt_text'));

        $this->expectException(InvalidMedia::class);
        $this->library->updateAltTexts($media, ['en' => 'New', 'pt-br' => '', 'es' => 'Nuevo']);
    }

    public function test_deleting_an_image_deletes_the_file_and_clears_covers(): void
    {
        $media = $this->library->store($this->upload($this->image('png')), self::ALT);
        $article = Article::factory()->for($media, 'cover')->create();

        $media->delete();

        Storage::disk('public')->assertMissing($media->path);
        $this->assertNull($article->refresh()->cover_media_id);
    }

    private function assertRefused(callable $store, ?string $message = null): void
    {
        try {
            $store();
            $this->fail('The upload was accepted.');
        } catch (InvalidMedia $e) {
            if ($message !== null) {
                $this->assertStringContainsString($message, $e->getMessage());
            }
        }

        $this->assertSame(0, Media::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    /**
     * @param  'jpeg'|'png'|'webp'|'gif'  $format
     * @param  int<1, max>  $width
     * @param  int<1, max>  $height
     */
    private function image(string $format, int $width = 40, int $height = 30): string
    {
        $image = imagecreatetruecolor($width, $height);
        $this->assertNotFalse($image);
        imagefill($image, 0, 0, (int) imagecolorallocate($image, 84, 38, 165));

        ob_start();
        match ($format) {
            'jpeg' => imagejpeg($image),
            'png' => imagepng($image),
            'webp' => imagewebp($image),
            'gif' => imagegif($image),
        };

        return (string) ob_get_clean();
    }

    private function upload(string $content, string $name = 'image.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }
}
