<?php
// Router for `php -S`, mirroring public/.htaccess's RewriteRules (which the
// built-in server doesn't read — without this, /api/endorse and friends
// 404 against a local `dist/` build even though they work behind Apache).
// See README.md's "Local development" section for the `php -S` invocation
// this is passed to.

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if (preg_match('#^/php/lib/#', $uri)) {
    http_response_code(403);
    return true;
}

$rewrites = [
    '#^/api/endorse/?$#' => '/php/endorse.php',
    '#^/api/endorsements/?$#' => '/php/endorsements.php',
    '#^/api/admin/moderate/?$#' => '/php/admin/moderate.php',
    '#^/api/admin/edit/?$#' => '/php/admin/edit-submit.php',
    '#^/api/admin/delete/?$#' => '/php/admin/delete.php',
    '#^/admin/([0-9]+)/?$#' => '/php/admin/edit.php',
    '#^/admin/?$#' => '/php/admin/endorsements.php',
];

foreach ($rewrites as $pattern => $target) {
    if (preg_match($pattern, $uri, $m)) {
        if (isset($m[1])) {
            $_GET['id'] = $m[1];
        }
        require $_SERVER['DOCUMENT_ROOT'] . $target;
        return true;
    }
}

return false; // fall back to serving the static file at $uri
