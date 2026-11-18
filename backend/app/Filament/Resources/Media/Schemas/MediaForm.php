<?php

namespace App\Filament\Resources\Media\Schemas;

use App\Enums\Locale;
use App\Media\MediaLibrary;
use App\Models\Media;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Textarea;
use Filament\Infolists\Components\ImageEntry;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

/**
 * Only collects the input. MediaLibrary checks the file and the texts again and
 * stores them; the checks here only give quicker feedback.
 */
class MediaForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->components([
                Section::make('Image')
                    ->schema([
                        FileUpload::make('file')
                            ->label('Image file')
                            ->helperText('JPEG, PNG or WebP, up to 5 MB. It is converted to WebP, at most 2400 pixels wide, without metadata (camera, location).')
                            ->acceptedFileTypes(array_keys(MediaLibrary::ACCEPTED))
                            ->maxSize(MediaLibrary::MAX_BYTES / 1024)
                            ->storeFiles(false)
                            ->required()
                            ->visibleOn('create'),
                        ImageEntry::make('preview')
                            ->hiddenLabel()
                            ->state(fn (?Media $record) => $record?->url())
                            ->imageHeight(240)
                            ->visibleOn('edit'),
                    ]),
                Section::make('Alternative text')
                    ->description('Describes the image for people who cannot see it. Required in every language.')
                    ->columns(['default' => 1, 'xl' => count(Locale::cases())])
                    ->schema(array_map(
                        fn (Locale $locale) => Textarea::make("alt.{$locale->value}")
                            ->label($locale->label())
                            ->required()
                            ->rows(3)
                            ->maxLength(MediaLibrary::MAX_ALT_LENGTH),
                        Locale::cases(),
                    )),
            ]);
    }
}
