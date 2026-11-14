<?php

return [
    /*
     * Host name the admin panel answers on (staging-admin.underplotsociety.com.br on
     * staging). On any other host the panel's routes do not exist, so the public
     * site's host never serves them. Empty: any host (local development and tests).
     */
    'domain' => env('ADMIN_DOMAIN') ?: null,
];
