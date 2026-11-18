<?php

namespace App\Filament\Resources\Media\Pages;

use App\Filament\Resources\Media\MediaResource;
use App\Media\InvalidMedia;
use App\Media\MediaLibrary;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Exceptions\Halt;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

class CreateMedia extends CreateRecord
{
    protected static string $resource = MediaResource::class;

    /**
     * @param  array<string, mixed>  $data
     */
    protected function handleRecordCreation(array $data): Model
    {
        $file = $data['file'] ?? null;
        $file = is_array($file) ? reset($file) : $file;
        $alt = is_array($data['alt'] ?? null) ? $data['alt'] : [];

        try {
            if (! $file instanceof UploadedFile) {
                throw new InvalidMedia('Choose an image file.');
            }

            return app(MediaLibrary::class)->store($file, $alt);
        } catch (InvalidMedia $e) {
            Notification::make()->danger()->title('Image not saved')->body($e->getMessage())->send();

            throw new Halt;
        }
    }
}
