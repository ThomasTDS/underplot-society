<?php

namespace App\Filament\Widgets;

use App\Models\PageView;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;

/** The most viewed pages over the last 30 days. */
class TopPages extends TableWidget
{
    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected static ?string $heading = 'Most viewed pages, last 30 days';

    public function table(Table $table): Table
    {
        return $table
            ->records(fn (): array => self::rows())
            ->columns([
                TextColumn::make('path')->label('Page'),
                TextColumn::make('locale')->label('Language'),
                TextColumn::make('views')->label('Views')->numeric()->alignEnd(),
            ])
            ->paginated(false)
            ->emptyStateHeading('No page views yet');
    }

    /** @return array<string, array{path: string, locale: string, views: int}> */
    public static function rows(int $limit = 20): array
    {
        $since = now('America/Sao_Paulo')->startOfDay()->subDays(29)->toDateString();

        return PageView::query()
            ->where('day', '>=', $since)
            ->selectRaw('path, locale, sum(views) as total')
            ->groupBy('path', 'locale')
            ->orderByDesc('total')
            ->orderBy('path')
            ->limit($limit)
            ->get()
            ->mapWithKeys(fn (PageView $row) => [$row->path => [
                'path' => $row->path,
                'locale' => $row->locale,
                'views' => (int) $row->getAttribute('total'),
            ]])
            ->all();
    }
}
