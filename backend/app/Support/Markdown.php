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

    public static function toHtml(string $markdown): HtmlString
    {
        $html = Str::markdown($markdown, [
            'html_input' => 'escape',
            'allow_unsafe_links' => false,
            'max_nesting_level' => 50,
        ]);

        return new HtmlString(self::sanitizer()->sanitize($html));
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
