<?php

namespace App\Support;

use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * Markdown to HTML, for the admin panel's preview and for the public site (the
 * API's body_html), so both show exactly the same thing.
 *
 * Two independent layers, so a gap in one is not enough to run a script:
 * 1. CommonMark escapes raw HTML in the text and drops links with unsafe schemes
 *    (javascript:, data:, vbscript:).
 * 2. An allow-list sanitizer then keeps only safe elements and attributes (no
 *    script, style, iframe, form or event handlers) and only http, https and
 *    mailto links.
 */
final class Markdown
{
    private static ?HtmlSanitizer $sanitizer = null;

    /**
     * @param  int  $topHeading  the highest heading level the text may use. The public
     *                           article page passes 2, so its title stays the only h1:
     *                           a text whose highest heading is "# ..." has every
     *                           heading moved down one level; one that starts at
     *                           "## ..." is left as written. h6 stays h6.
     */
    public static function toHtml(string $markdown, int $topHeading = 1): HtmlString
    {
        $html = Str::markdown($markdown, [
            'html_input' => 'escape',
            'allow_unsafe_links' => false,
            'max_nesting_level' => 50,
        ]);

        $html = self::sanitizer()->sanitize($html);

        // The sanitizer's output is normalized: plain <hN> and </hN> tags only.
        preg_match_all('#<h([1-6])>#', $html, $levels);
        $shift = $levels[1] === [] ? 0 : max(0, $topHeading - min(array_map('intval', $levels[1])));
        if ($shift > 0) {
            $html = (string) preg_replace_callback(
                '#<(/?)h([1-6])>#',
                fn (array $m) => '<'.$m[1].'h'.min(6, (int) $m[2] + $shift).'>',
                $html,
            );
        }

        return new HtmlString($html);
    }

    private static function sanitizer(): HtmlSanitizer
    {
        return self::$sanitizer ??= new HtmlSanitizer(
            (new HtmlSanitizerConfig)
                ->allowSafeElements()
                ->allowLinkSchemes(['https', 'http', 'mailto'])
                ->allowRelativeLinks()
                ->allowMediaSchemes(['https', 'http'])
                ->allowRelativeMedias()
                // A linked page cannot reach back into the site through window.opener.
                ->forceAttribute('a', 'rel', 'noopener noreferrer')
                ->withMaxInputLength(500_000),
        );
    }
}
