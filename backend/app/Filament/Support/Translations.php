<?php

namespace App\Filament\Support;

use App\Enums\Locale;
use App\Models\ArticleTranslation;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Unique;

/**
 * Pieces shared by the forms that edit one record in the three languages.
 */
final class Translations
{
    /**
     * A repeater with exactly one item per language, side by side on wide screens.
     *
     * @param  array<int, mixed>  $fields
     */
    public static function repeater(array $fields): Repeater
    {
        return Repeater::make('translations')
            ->label('Translations')
            ->relationship()
            ->schema([
                Hidden::make('locale')->required(),
                ...$fields,
            ])
            ->default(array_map(fn (Locale $locale) => ['locale' => $locale->value], Locale::cases()))
            ->minItems(count(Locale::cases()))
            ->maxItems(count(Locale::cases()))
            ->addable(false)
            ->deletable(false)
            ->reorderable(false)
            ->grid(['default' => 1, 'xl' => count(Locale::cases())])
            ->itemLabel(fn (array $state): string => self::label($state['locale'] ?? null));
    }

    /**
     * The title field, which fills the slug while the slug is still empty.
     */
    public static function title(string $name = 'title', int $maxLength = 200): TextInput
    {
        return TextInput::make($name)
            ->required()
            ->maxLength($maxLength)
            ->live(onBlur: true)
            ->afterStateUpdated(function (Get $get, Set $set, ?string $state) {
                if (blank($get('slug')) && filled($state)) {
                    $set('slug', Str::slug($state));
                }
            });
    }

    /**
     * The slug: lowercase words and hyphens, unique within its language in $table.
     */
    public static function slug(string $table, int $maxLength): TextInput
    {
        return TextInput::make('slug')
            ->required()
            ->maxLength($maxLength)
            ->regex(ArticleTranslation::SLUG_PATTERN)
            ->helperText('Lowercase letters, numbers and hyphens. Part of the address.')
            ->unique(
                table: $table,
                ignoreRecord: true,
                modifyRuleUsing: fn (Unique $rule, Get $get) => $rule->where('locale', $get('locale')),
            );
    }

    public static function label(mixed $locale): string
    {
        $locale = $locale instanceof Locale ? $locale : Locale::tryFrom((string) $locale);

        return $locale?->label() ?? 'Translation';
    }
}
