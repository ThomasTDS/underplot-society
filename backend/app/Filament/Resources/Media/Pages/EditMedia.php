<?php

namespace App\Filament\Resources\Media\Pages;

use App\Filament\Resources\Media\MediaResource;
use App\Media\InvalidMedia;
use App\Media\MediaLibrary;
use App\Models\Media;
use App\Models\MediaTranslation;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Exceptions\Halt;
use Illuminate\Database\Eloquent\Model;

/**
 * Only the alternative texts can change; a different image is a new upload.
 */
class EditMedia extends EditRecord
{
    protected static string $resource = MediaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make()
                ->modalDescription(fn (Media $record) => $record->articles()->exists()
                    ? 'Articles using this image as their cover will have no cover.'
                    : 'The image file is deleted too.'),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        $record = $this->getRecord();
        assert($record instanceof Media);

        $data['alt'] = $record->translations
            ->mapWithKeys(fn (MediaTranslation $t) => [$t->locale->value => $t->alt_text])
            ->all();

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        assert($record instanceof Media);

        try {
            app(MediaLibrary::class)->updateAltTexts($record, is_array($data['alt'] ?? null) ? $data['alt'] : []);
        } catch (InvalidMedia $e) {
            Notification::make()->danger()->title('Not saved')->body($e->getMessage())->send();

            throw new Halt;
        }

        return $record;
    }
}
