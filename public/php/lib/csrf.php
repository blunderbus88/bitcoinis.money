<?php
// Minimal same-origin check for state-changing POST requests — ports the
// protection src/astro.config.mjs got for free from Astro's
// `security.checkOrigin` (no longer available once this runs as plain PHP).
// Only checks when a browser actually sends Origin/Referer (both are
// omitted by some non-browser clients); mismatched values are rejected.

function csrf_origin_ok(): bool {
    $config = require __DIR__ . '/config.php';
    $expectedHost = parse_url($config['site_url'] ?? '', PHP_URL_HOST);
    if (!$expectedHost) return true; // misconfigured site_url — don't lock everyone out

    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin !== null) {
        return parse_url($origin, PHP_URL_HOST) === $expectedHost;
    }

    $referer = $_SERVER['HTTP_REFERER'] ?? null;
    if ($referer !== null) {
        return parse_url($referer, PHP_URL_HOST) === $expectedHost;
    }

    return true;
}
