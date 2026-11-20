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
        $this->assertMatchesRegularExpression('#<a href="https://example.com" rel="noopener noreferrer">link</a>#', $html);
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
        yield 'javascript image' => ['![x](javascript:alert(1))', 'javascript:'];
        yield 'svg onload' => ['<svg onload=alert(1)>', '<svg'];
        yield 'style tag' => ['<style>body{display:none}</style>', '<style'];
        yield 'form' => ['<form action="https://evil.example"><input></form>', '<form'];
        yield 'autolink with javascript' => ['<javascript:alert(1)>', 'href="javascript'];
        yield 'entity-encoded scheme' => ['[click](&#106;avascript:alert(1))', 'href="&#106;avascript'];
        yield 'html inside a link title' => ['[a](https://x.example "<script>alert(1)</script>")', '<script'];
    }

    #[DataProvider('hostileInput')]
    public function test_html_and_unsafe_links_do_not_survive(string $markdown, string $forbidden): void
    {
        $html = Markdown::toHtml($markdown)->toHtml();

        $this->assertStringNotContainsStringIgnoringCase($forbidden, $html);
        $this->assertDoesNotMatchRegularExpression('/\son\w+\s*=/i', $html, 'no event handler attribute may survive');
    }

    public function test_regular_formatting_survives_the_sanitizer(): void
    {
        $markdown = '## Heading

> Quote

- one
- two

1. first

`code` and

```
block
```

![Alt text](/storage/media/a.webp)

[mail](mailto:a@example.com)';
        $html = Markdown::toHtml($markdown)->toHtml();

        foreach (['<h2>Heading</h2>', '<blockquote>', '<ul>', '<ol>', '<code>code</code>', '<pre><code>block', '<img src="/storage/media/a.webp" alt="Alt text"', 'href="mailto:'] as $expected) {
            $this->assertStringContainsString($expected, $html);
        }
    }

    public function test_a_text_that_starts_at_h1_moves_down_for_the_article_page(): void
    {
        $markdown = "# One\n\n## Two\n\n###### Six\n\nText with <h1> written in it.";

        $html = Markdown::toHtml($markdown, topHeading: 2)->toHtml();

        $this->assertStringContainsString('<h2>One</h2>', $html);
        $this->assertStringContainsString('<h3>Two</h3>', $html);
        $this->assertStringContainsString('<h6>Six</h6>', $html, 'h6 is the lowest level');
        $this->assertStringNotContainsString('<h1>', $html);
        $this->assertStringContainsString('&lt;h1&gt;', $html, 'escaped text is left alone');
    }

    public function test_a_text_that_starts_at_h2_is_left_as_written(): void
    {
        $html = Markdown::toHtml("## Two\n\n### Three", topHeading: 2)->toHtml();

        $this->assertStringContainsString('<h2>Two</h2>', $html);
        $this->assertStringContainsString('<h3>Three</h3>', $html);
    }

    public function test_the_preview_keeps_the_levels_as_written(): void
    {
        $this->assertStringContainsString('<h1>One</h1>', Markdown::toHtml('# One')->toHtml());
    }
}
