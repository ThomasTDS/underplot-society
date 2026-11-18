<?php

namespace App\Media;

use DomainException;

/**
 * An upload or an alternative text the media library refuses. The message is safe
 * to show to the administrator.
 */
final class InvalidMedia extends DomainException {}
