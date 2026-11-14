{{-- Preview of one translation. $body is HTML from App\Support\Markdown (raw HTML escaped). --}}
<article class="fi-prose" lang="{{ $locale }}">
    <h1>{{ $title }}</h1>
    @if (filled($summary))
        <p><strong>{{ $summary }}</strong></p>
    @endif
    {{ $body }}
</article>
