<?php

namespace App\Filament\Widgets;

use App\Models\PageView;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

/**
 * Page views today and over the last 7 and 30 days, with a daily line for the month.
 * Counts only: the site stores no visitor data (see PageView).
 */
class PageViewsOverview extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected ?string $heading = 'Page views';

    protected ?string $description = 'Pages opened on the site, counted without cookies or personal data. Bots and prefetches are not counted.';

    protected function getStats(): array
    {
        $today = now('America/Sao_Paulo')->startOfDay();
        $daily = PageView::query()
            ->where('day', '>', $today->copy()->subDays(30)->toDateString())
            ->selectRaw('day, sum(views) as total')
            ->groupBy('day')
            ->pluck('total', 'day')
            ->mapWithKeys(fn ($total, $day) => [substr((string) $day, 0, 10) => (int) $total]);

        $series = [];
        for ($i = 29; $i >= 0; $i--) {
            $series[] = (float) ($daily[$today->copy()->subDays($i)->toDateString()] ?? 0);
        }

        return [
            Stat::make('Today', number_format((int) end($series))),
            Stat::make('Last 7 days', number_format((int) array_sum(array_slice($series, -7))))->chart(array_slice($series, -7)),
            Stat::make('Last 30 days', number_format((int) array_sum($series)))->chart($series),
        ];
    }
}
