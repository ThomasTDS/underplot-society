<?php

namespace App\Filament\Resources\Articles\Tables;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Article;
use App\Models\ArticleTranslation;
use DomainException;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Notifications\Notification;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class ArticlesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with(['translations', 'area.translations']))
            ->defaultSort('updated_at', 'desc')
            ->columns([
                TextColumn::make('title')
                    ->label('Title (English)')
                    ->state(fn (Article $record) => self::english($record)->title ?? '—')
                    ->searchable(query: fn (Builder $query, string $search) => $query->whereHas(
                        'translations',
                        fn (Builder $q) => $q->where('title', 'like', "%{$search}%"),
                    )),
                TextColumn::make('area')
                    ->state(fn (Article $record) => $record->area->label()),
                TextColumn::make('status')
                    ->label('Status per language')
                    ->state(fn (Article $record) => self::statusSummary($record)),
                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable(),
            ])
            ->recordActions([
                EditAction::make(),
                Action::make('publish')
                    ->label('Publish')
                    ->icon(Heroicon::OutlinedGlobeAlt)
                    ->color('success')
                    ->schema([
                        DateTimePicker::make('at')
                            ->label('Publication date')
                            ->seconds(false)
                            ->helperText('Empty: now. A future date schedules the three languages.'),
                    ])
                    ->action(function (Article $record, array $data) {
                        $at = isset($data['at']) ? Carbon::parse($data['at']) : null;

                        try {
                            $record->publish($at);
                        } catch (DomainException $e) {
                            Notification::make()->danger()->title('Not published')->body($e->getMessage())->send();

                            return;
                        }

                        Notification::make()->success()->title($at?->isFuture() ? 'Scheduled' : 'Published')->send();
                    }),
                Action::make('unpublish')
                    ->label('Unpublish')
                    ->icon(Heroicon::OutlinedEyeSlash)
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalDescription('The article leaves the site in all three languages and goes back to draft.')
                    ->action(function (Article $record) {
                        $record->unpublish();
                        Notification::make()->success()->title('Unpublished')->send();
                    }),
            ]);
    }

    private static function english(Article $article): ?ArticleTranslation
    {
        return $article->translations->first(fn (ArticleTranslation $t) => $t->locale === Locale::En);
    }

    /**
     * For example "EN published · PT-BR scheduled · ES draft".
     */
    private static function statusSummary(Article $article): string
    {
        return $article->translations
            ->sortBy(fn (ArticleTranslation $t) => array_search($t->locale, Locale::cases(), true))
            ->map(function (ArticleTranslation $t) {
                $state = match (true) {
                    $t->status === PublicationStatus::Draft => 'draft',
                    $t->published_at?->isFuture() === true => 'scheduled',
                    default => 'published',
                };

                return strtoupper($t->locale->value).' '.$state;
            })
            ->implode(' · ');
    }
}
