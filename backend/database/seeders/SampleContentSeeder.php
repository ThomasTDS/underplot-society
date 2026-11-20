<?php

namespace Database\Seeders;

use App\Enums\Locale;
use App\Models\Area;
use App\Models\Article;
use App\Models\ArticleTranslation;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sample articles for staging and the end-to-end tests, in all three languages.
 * Every title starts with "Sample", so they are easy to find and delete before
 * launch. Safe to run again: existing samples are left alone.
 *
 *     php artisan db:seed --class=SampleContentSeeder --force
 */
class SampleContentSeeder extends Seeder
{
    /** @var array<string, array{position: int, names: array<string, string>}> */
    private const AREAS = [
        'technology' => ['position' => 1, 'names' => ['en' => 'Technology', 'pt-br' => 'Tecnologia', 'es' => 'Tecnología']],
        'culture' => ['position' => 2, 'names' => ['en' => 'Culture', 'pt-br' => 'Cultura', 'es' => 'Cultura']],
    ];

    public function run(): void
    {
        DB::transaction(function () {
            $areas = [];
            foreach (self::AREAS as $key => $area) {
                $areas[$key] = $this->area($area['position'], $area['names']);
            }

            foreach ($this->articles() as $index => [$area, $texts]) {
                $this->article($areas[$area], $texts, now()->subDays(10 - $index));
            }
        });
    }

    /**
     * @param  array<string, string>  $names
     */
    private function area(int $position, array $names): Area
    {
        $existing = Area::whereHas('translations', fn ($q) => $q->where('locale', Locale::En)->where('slug', $this->slug($names['en'])))->first();
        if ($existing !== null) {
            return $existing;
        }

        $area = Area::create(['position' => $position]);
        foreach ($names as $locale => $name) {
            $area->translations()->create(['locale' => $locale, 'name' => $name, 'slug' => $this->slug($name)]);
        }

        return $area;
    }

    /**
     * @param  array<string, array{slug: string, title: string, summary: string, body: string}>  $texts
     */
    private function article(Area $area, array $texts, CarbonInterface $publishedAt): void
    {
        if (ArticleTranslation::where('locale', Locale::En)->where('slug', $texts['en']['slug'])->exists()) {
            return;
        }

        $article = Article::create(['area_id' => $area->id]);
        foreach ($texts as $locale => $text) {
            $article->translations()->create(['locale' => $locale] + $text);
        }
        $article->publish($publishedAt);
    }

    private function slug(string $name): string
    {
        return Str::slug($name);
    }

    /**
     * @return list<array{string, array<string, array{slug: string, title: string, summary: string, body: string}>}>
     */
    private function articles(): array
    {
        $body = fn (string $intro, string $heading, string $item1, string $item2, string $quote, string $code = 'Example code') => <<<MD
            {$intro}

            ## {$heading}

            - {$item1}
            - {$item2}

            > {$quote}

            {$code}: `const answer = 42;`

            [Underplot Society](https://underplotsociety.com.br)
            MD;

        return [
            ['technology', [
                'en' => ['slug' => 'sample-reading-the-fine-print', 'title' => 'Sample: reading the fine print of the tools we use', 'summary' => 'A sample article to check the list, the filter and the article page.', 'body' => $body('This is sample text for staging.', 'What to look for', 'Who owns the data', 'What happens when the service ends', 'Every tool is also a decision.')],
                'pt-br' => ['slug' => 'exemplo-lendo-as-letras-miudas', 'title' => 'Exemplo: lendo as letras miúdas das ferramentas que usamos', 'summary' => 'Um artigo de exemplo para conferir a lista, o filtro e a página do artigo.', 'body' => $body('Este é um texto de exemplo para o staging.', 'O que observar', 'Quem é dono dos dados', 'O que acontece quando o serviço acaba', 'Toda ferramenta também é uma decisão.', 'Exemplo de código')],
                'es' => ['slug' => 'ejemplo-leyendo-la-letra-pequena', 'title' => 'Ejemplo: leyendo la letra pequeña de las herramientas que usamos', 'summary' => 'Un artículo de ejemplo para revisar la lista, el filtro y la página del artículo.', 'body' => $body('Este es un texto de ejemplo para staging.', 'Qué observar', 'Quién es dueño de los datos', 'Qué pasa cuando el servicio termina', 'Toda herramienta también es una decisión.', 'Código de ejemplo')],
            ]],
            ['culture', [
                'en' => ['slug' => 'sample-stories-beneath-the-surface', 'title' => 'Sample: stories beneath the surface', 'summary' => 'A second sample, in another area, to test the filter.', 'body' => $body('Sample text in the Culture area.', 'Layers', 'What is said', 'What is left out', 'The plot is rarely where it seems.')],
                'pt-br' => ['slug' => 'exemplo-historias-sob-a-superficie', 'title' => 'Exemplo: histórias sob a superfície', 'summary' => 'Um segundo exemplo, em outra área, para testar o filtro.', 'body' => $body('Texto de exemplo na área Cultura.', 'Camadas', 'O que é dito', 'O que fica de fora', 'A trama raramente está onde parece.', 'Exemplo de código')],
                'es' => ['slug' => 'ejemplo-historias-bajo-la-superficie', 'title' => 'Ejemplo: historias bajo la superficie', 'summary' => 'Un segundo ejemplo, en otra área, para probar el filtro.', 'body' => $body('Texto de ejemplo en el área Cultura.', 'Capas', 'Lo que se dice', 'Lo que queda fuera', 'La trama rara vez está donde parece.', 'Código de ejemplo')],
            ]],
            ['technology', [
                'en' => ['slug' => 'sample-a-third-article', 'title' => 'Sample: a third article', 'summary' => 'A third sample, so the home page has more than one recent article.', 'body' => $body('More sample text.', 'Notes', 'First note', 'Second note', 'Short and simple.')],
                'pt-br' => ['slug' => 'exemplo-um-terceiro-artigo', 'title' => 'Exemplo: um terceiro artigo', 'summary' => 'Um terceiro exemplo, para a página inicial ter mais de um artigo recente.', 'body' => $body('Mais texto de exemplo.', 'Notas', 'Primeira nota', 'Segunda nota', 'Curto e simples.', 'Exemplo de código')],
                'es' => ['slug' => 'ejemplo-un-tercer-articulo', 'title' => 'Ejemplo: un tercer artículo', 'summary' => 'Un tercer ejemplo, para que la página de inicio tenga más de un artículo reciente.', 'body' => $body('Más texto de ejemplo.', 'Notas', 'Primera nota', 'Segunda nota', 'Corto y simple.', 'Código de ejemplo')],
            ]],
        ];
    }
}
