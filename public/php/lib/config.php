<?php
// Loads config.php from the repo root. lib/ is always three levels below
// the repo root (<root>/dist/php/lib after build, <root>/public/php/lib in
// source — same depth either way since PHP only ever runs from the built
// dist/ directory, whether locally via `php -S -t dist` or on SiteGround).
$configPath = dirname(__DIR__, 3) . '/config.php';

if (!file_exists($configPath)) {
    http_response_code(500);
    error_log('[config] config.php not found at ' . $configPath . ' — copy config.php.example and fill it in.');
    die('Server misconfigured.');
}

return require $configPath;
