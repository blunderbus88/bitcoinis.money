<?php
// Ports src/pages/api/endorse.ts. Reached at /api/endorse via the rewrite
// in public/.htaccess — the form's action attribute never changed.

require_once __DIR__ . '/lib/csrf.php';
require_once __DIR__ . '/lib/principles.php';
require_once __DIR__ . '/lib/validation.php';
require_once __DIR__ . '/lib/turnstile.php';
require_once __DIR__ . '/lib/rateLimit.php';
require_once __DIR__ . '/lib/db.php';

function redirect_to(string $path, array $params = []): void {
    $url = $path . (count($params) ? '?' . http_build_query($params) : '');
    header('Location: ' . $url, true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!csrf_origin_ok()) {
    http_response_code(403);
    exit('Forbidden');
}

$ip = rate_limit_client_ip();
$ipHash = rate_limit_hash_ip($ip);

if (rate_limit_is_limited($ipHash)) {
    redirect_to('/endorse', ['error' => 'rate_limited']);
}

$name = validate_name($_POST['name'] ?? null);
$participantTypes = validate_participant_types($_POST['participant_type'] ?? []);
$website = validate_url($_POST['website'] ?? null);
$github = validate_github($_POST['github'] ?? null);
$xProfile = validate_x_profile($_POST['x_profile'] ?? null);
$nostr = validate_nostr($_POST['nostr'] ?? null);
$comment = validate_comment($_POST['comment'] ?? null);
$submittedVersion = validate_version($_POST['principles_version'] ?? null);
$submittedHash = validate_hash($_POST['principles_hash'] ?? null);

if (!$name || !$participantTypes || !$submittedVersion || !$submittedHash) {
    redirect_to('/endorse', ['error' => 'validation']);
}

// The signature must be bound to the currently published version. If the
// Principles were re-released between page load and submission, reject
// rather than silently signing the wrong (or a stale) version.
$current = principles_get_current();
if (!$current || $submittedVersion !== $current['version'] || $submittedHash !== $current['hash']) {
    redirect_to('/endorse', ['error' => 'version']);
}

$turnstileToken = $_POST['cf-turnstile-response'] ?? null;
$verified = turnstile_verify(is_string($turnstileToken) ? $turnstileToken : null, $ip);
if (!$verified) {
    redirect_to('/endorse', ['error' => 'challenge']);
}

db_insert_signature([
    'name' => $name,
    'participantTypes' => $participantTypes,
    'website' => $website,
    'github' => $github,
    'xProfile' => $xProfile,
    'nostr' => $nostr,
    'comment' => $comment,
    'principlesVersion' => $submittedVersion,
    'principlesHash' => $submittedHash,
    'ipHash' => $ipHash,
]);

redirect_to('/endorse', ['submitted' => '1']);
