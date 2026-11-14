<?php

namespace App\Support;

use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;

/**
 * Markdown to HTML for the admin panel's preview. Raw HTML in the text is escaped,
 * not rendered, and links with unsafe schemes (javascript:, data:...) are dropped,
 * so an article cannot run a script in the panel.
 */
final class Markdown
{
    public static function toHtml(string $markdown): HtmlString
    {
        return new HtmlString(Str::markdown($markdown, [
            'html_input' => 'escape',
            'allow_unsafe_links' => false,
            'max_nesting_level' => 50,
        ]));
    }
}
