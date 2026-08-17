<?php
// Ports src/pages/api/admin/edit.ts. Reached at /api/admin/edit via the
// rewrite in public/.htaccess. Protected by Apache Basic Auth
// (public/php/admin/.htaccess). Named edit-submit.php (not edit.php) to
// stay distinct from admin/edit.php, the GET view this posts back to.

require_once __DIR__ . '/../lib/csrf.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/validation.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!csrf_origin_ok()) {
    http_response_code(403);
    exit('Forbidden');
}

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
if ($id <= 0 || !db_get_signature_by_id($id)) {
    http_response_code(400);
    exit('Bad request');
}

$name = validate_name($_POST['name'] ?? null);
$participantTypes = validate_participant_types($_POST['participant_type'] ?? []);

if (!$name || !$participantTypes) {
    header('Location: /admin/' . $id . '?error=validation', true, 303);
    exit;
}

db_update_signature_fields($id, [
    'name' => $name,
    'participantTypes' => $participantTypes,
    'website' => validate_url($_POST['website'] ?? null),
    'github' => validate_github($_POST['github'] ?? null),
    'xProfile' => validate_x_profile($_POST['x_profile'] ?? null),
    'nostr' => validate_nostr($_POST['nostr'] ?? null),
    'comment' => validate_comment($_POST['comment'] ?? null),
]);

header('Location: /admin/' . $id . '?updated=1', true, 303);
