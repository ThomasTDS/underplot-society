<?php

namespace App\Enums;

/**
 * The languages the site publishes in. Every article is written in all three.
 * Keep in sync with the frontend's frontend/src/i18n/config.ts.
 */
enum Locale: string
{
    case En = 'en';
    case PtBr = 'pt-br';
    case Es = 'es';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
