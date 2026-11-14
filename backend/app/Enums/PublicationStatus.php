<?php

namespace App\Enums;

/**
 * Whether a translation is visible on the public site. A published translation with a
 * future published_at stays hidden until that moment (scheduling).
 */
enum PublicationStatus: string
{
    case Draft = 'draft';
    case Published = 'published';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
