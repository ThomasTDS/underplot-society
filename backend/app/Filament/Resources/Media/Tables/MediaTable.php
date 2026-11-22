<?php

namespace App\Filament\Resources\Media\Tables;

use App\Models\Media;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Number;

class MediaTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('translations')->withCount('articles'))
            ->defaultSort('created_at', 'desc')
            ->columns([
                ImageColumn::make('preview')
                    ->state(fn (Media $record) => $record->url())
                    ->imageHeight(56),
                TextColumn::make('alt')
                    ->label('Alternative text (English)')
                    ->state(fn (Media $record) => $record->altText() ?? '—')
                    ->wrap(),
                TextColumn::make('address')
                    ->label('Address')
                    ->tooltip('Click to copy. In an article: ![alternative text](address)')
                    ->state(fn (Media $record) => $record->relativeUrl())
                    ->copyable()
                    ->copyMessage('Address copied')
                    ->limit(32),
                TextColumn::make('dimensions')
                    ->state(fn (Media $record) => "{$record->width} × {$record->height}"),
                TextColumn::make('size_bytes')
                    ->label('Size')
                    ->formatStateUsing(fn (int $state) => Number::fileSize($state, 1)),
                TextColumn::make('articles_count')->label('Covers'),
                TextColumn::make('created_at')->label('Uploaded')->dateTime()->sortable(),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
