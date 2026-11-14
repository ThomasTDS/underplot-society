<?php

// OpenAPI document generated from the code by Scramble (a development dependency).
// Regenerate backend/openapi.json with `composer openapi`; CI fails when it is stale.
// Top-level keys here replace the package defaults.
return [
    'export_path' => 'openapi.json',

    'info' => [
        'version' => '1.0.0',
        'description' => 'Read-only API behind the Underplot Society site. Every path is under `/api`; content paths take a language prefix (`en`, `pt-br` or `es`).',
    ],

    // A fixed URL, so the document does not change with APP_URL.
    'servers' => [
        'Staging' => 'https://staging.underplotsociety.com.br/api',
    ],
];
