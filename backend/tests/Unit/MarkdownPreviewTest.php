<?php

namespace Tests\Unit;

use App\Support\Markdown;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MarkdownPreviewTest extends TestCase
{
    public function test_markdown_is_rendered(): void
    {
        $html = Markdown::toHtml("# Title\n\nSome **bold** text and a [link](https://example.com).")->toHtml();

        $this->assertStringContainsString('<h1>Title</h1>', $html);
        $this->assertStringContainsString('<strong>bold</strong>', $html);
        $this->assertStringContainsString('<a href="https://example.com">link</a>', $html);
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function hostileInput(): iterable
    {
        yield 'script tag' => ['<script>alert(1)</script>', '<script'];
        yield 'event handler' => ['<img src=x onerror=alert(1)>', '<img'];
        yield 'iframe' => ['<iframe src="https://example.com"></iframe>', '<iframe'];
        yield 'javascript link' => ['[click](javascript:alert(1))', 'javascript:'];
        yield 'data link' => ['[click](data:text/html;base64,PHNjcmlwdD4=)', 'data:text/html'];
        yield 'vbscript link' => ['[click](vbscript:msgbox(1))', 'vbscript:'];
    }

    #[DataProvider('hostileInput')]
    public function test_html_and_unsafe_links_do_not_survive(string $markdown, string $forbidden): void
    {
        $html = Markdown::toHtml($markdown)->toHtml();

        $this->assertStringNotContainsStringIgnoringCase($forbidden, $html);
    }
}
