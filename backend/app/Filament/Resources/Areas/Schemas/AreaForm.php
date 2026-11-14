<?php

namespace App\Filament\Resources\Areas\Schemas;

use App\Filament\Support\Translations;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class AreaForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->components([
                Section::make('Area')
                    ->schema([
                        TextInput::make('position')
                            ->helperText('Order in menus and filters; lower comes first.')
                            ->integer()
                            ->minValue(0)
                            ->maxValue(1000)
                            ->default(0)
                            ->required(),
                    ]),
                Translations::repeater([
                    Translations::title('name', 100),
                    Translations::slug('area_translations', 100),
                ]),
            ]);
    }
}
