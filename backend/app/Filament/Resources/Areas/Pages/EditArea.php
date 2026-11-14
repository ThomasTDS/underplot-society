<?php

namespace App\Filament\Resources\Areas\Pages;

use App\Filament\Resources\Areas\AreaResource;
use App\Models\Area;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditArea extends EditRecord
{
    protected static string $resource = AreaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // The database refuses to delete an area that still has articles.
            DeleteAction::make()
                ->hidden(fn (Area $record) => $record->articles()->exists()),
        ];
    }
}
