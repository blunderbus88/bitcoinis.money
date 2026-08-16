<?php
// Ports src/pages/api/admin/delete.ts. Reached at /api/admin/delete via the
// rewrite in public/.htaccess. Protected by Apache Basic Auth
// (public/php/admin/.htaccess).

require_once __DIR__ . '/../lib/csrf.php';
require_once __DIR__ . '/../lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!csrf_origin_ok()) {
    http_response_code(403);
    exit('Forbidden');
}

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    exit('Bad request');
}

db_delete_signature($id);

header('Location: /admin/endorsements', true, 303);
