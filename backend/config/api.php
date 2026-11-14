<?php

return [
    /*
     * Requests per minute each visitor may make to the content API (/api/v1).
     */
    'rate_limit' => (int) env('API_RATE_LIMIT', 60),

    /*
     * Requests per minute for the site's own server (the frontend), counted together.
     * Only applies when client_ip_header is set, which is what tells the two apart.
     */
    'internal_rate_limit' => (int) env('API_INTERNAL_RATE_LIMIT', 600),

    /*
     * Header carrying the visitor's IP address, set by the proxy in front of the app
     * (CF-Connecting-IP behind Cloudflare). Leave it empty unless the app can only be
     * reached through that proxy or from the frontend: anyone who can reach the app
     * directly could otherwise send a fake address. Requests without the header are
     * then the frontend's.
     */
    'client_ip_header' => env('CLIENT_IP_HEADER') ?: null,
];
