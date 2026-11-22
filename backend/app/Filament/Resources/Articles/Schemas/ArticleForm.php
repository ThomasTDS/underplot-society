<?php

namespace App\Filament\Resources\Articles\Schemas;

use App\Enums\PublicationStatus;
use App\Filament\Support\Translations;
use App\Models\Area;
use App\Models\Media;
use App\Support\Markdown;
use Filament\Actions\Action;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\MarkdownEditor;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;

class ArticleForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->components([
                Section::make('Article')
                    ->schema([
                        Select::make('area_id')
                            ->label('Area')
                            ->required()
                            ->options(fn () => Area::query()
                                ->with('translations')
                                ->orderBy('position')
                                ->get()
                                ->mapWithKeys(fn (Area $area) => [$area->id => $area->label()])
                                ->all()),
                        Select::make('cover_media_id')
                            ->label('Cover image')
                            ->helperText('Upload images under Images; every image has alternative text in the three languages.')
                            ->searchable()
                            ->options(fn () => Media::query()
                                ->with('translations')
                                ->latest()
                                ->get()
                                ->mapWithKeys(fn (Media $media) => [$media->id => $media->altText() ?? "Image #{$media->id}"])
                                ->all()),
                    ]),

                Translations::repeater([
                    Translations::title(),
                    Translations::slug('article_translations', 150),
                    Textarea::make('summary')
                        ->required()
                        ->rows(3)
                        ->maxLength(500),
                    MarkdownEditor::make('body')
                        ->required()
                        ->helperText('Markdown. Start sections at ##. For an image inside the text, copy its address under Images and write ![alternative text](address), with the alternative text in this language.')
                        // Uploads come with item 6.3, with type checks and alternative text.
                        ->fileAttachments(false),
                    Select::make('status')
                        ->options([
                            PublicationStatus::Draft->value => 'Draft',
                            PublicationStatus::Published->value => 'Published',
                        ])
                        ->default(PublicationStatus::Draft->value)
                        ->required()
                        ->selectablePlaceholder(false),
                    DateTimePicker::make('published_at')
                        ->label('Publication date')
                        ->seconds(false)
                        ->helperText('Empty: now, when published. A future date schedules it.'),
                    TextInput::make('seo_title')
                        ->label('SEO title')
                        ->maxLength(70)
                        ->helperText('Optional. Defaults to the title.'),
                    Textarea::make('seo_description')
                        ->label('SEO description')
                        ->rows(2)
                        ->maxLength(160)
                        ->helperText('Optional. Defaults to the summary.'),
                ])->extraItemActions([
                    Action::make('preview')
                        ->icon(Heroicon::OutlinedEye)
                        ->tooltip('Preview')
                        ->modalHeading(fn (array $arguments, Repeater $component) => 'Preview: '.Translations::label($component->getRawItemState($arguments['item'])['locale'] ?? null))
                        ->modalContent(function (array $arguments, Repeater $component) {
                            $item = $component->getRawItemState($arguments['item']);

                            return view('filament.markdown-preview', [
                                'locale' => (string) ($item['locale'] ?? ''),
                                'title' => (string) ($item['title'] ?? ''),
                                'summary' => (string) ($item['summary'] ?? ''),
                                'body' => Markdown::toHtml((string) ($item['body'] ?? '')),
                            ]);
                        })
                        ->modalSubmitAction(false)
                        ->modalCancelActionLabel('Close'),
                ]),
            ]);
    }
}
