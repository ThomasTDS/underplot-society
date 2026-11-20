<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Daily total of views of one page. Holds no personal data: no address, cookie,
 * user agent or identifier, only the page, the day and a count.
 *
 * @property string $day
 * @property string $path
 * @property string $locale
 * @property int $views
 */
class PageView extends Model
{
    public $timestamps = false;

    /**
     * The pages that are counted, and nothing else: anything a client sends that is not
     * one of the site's pages is refused, so the table cannot fill with junk.
     */
    public const PATH = '#^/(en|pt-br|es)(?:/(?:articles(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?|about|privacy|accessibility))?$#';

    protected function casts(): array
    {
        return ['day' => 'date:Y-m-d', 'views' => 'integer'];
    }

    public static function isCountable(string $path): bool
    {
        return strlen($path) <= 200 && preg_match(self::PATH, $path) === 1;
    }

    /** Adds one view of the page today (in the site's time zone), in one statement. */
    public static function record(string $path): void
    {
        $locale = explode('/', $path)[1];

        DB::table('page_views')->upsert(
            [[
                'day' => now('America/Sao_Paulo')->toDateString(),
                'path' => $path,
                'locale' => Locale::from($locale)->value,
                'views' => 1,
            ]],
            ['day', 'path'],
            ['views' => DB::raw('page_views.views + 1')],
        );
    }
}
