<?php

namespace App\Filament\Resources\Areas\Tables;

use App\Models\Area;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class AreasTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('translations')->withCount('articles'))
            ->defaultSort('position')
            ->columns([
                TextColumn::make('name')
                    ->state(fn (Area $record) => $record->label()),
                TextColumn::make('position')->sortable(),
                TextColumn::make('articles_count')->label('Articles'),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
