<?php
// JSON data for approved signatures — consumed client-side by the static
// /endorsements page (src/pages/endorsements.astro) AND the inline
// endorsements widget on the Principles page
// (src/components/PrinciplesDocument.astro). Both used to read the DB
// server-side directly; now that everything's static output, they fetch
// this instead. Reached at /api/endorsements via public/.htaccess.

require_once __DIR__ . '/lib/db.php';

header('Content-Type: application/json');
// SiteGround's front-end proxy caches GET responses by default, which would
// serve stale approved-signature lists — confirmed live (X-Proxy-Cache:
// HIT on this endpoint until this header was added).
header('Cache-Control: no-store, no-cache, must-revalidate');

$signatures = db_list_approved_signatures();
$total = db_count_approved_signatures();

echo json_encode([
    'total' => $total,
    'signatures' => array_map(fn($sig) => [
        'name' => $sig['name'],
        'participantTypes' => db_parse_participant_types($sig['participant_type']),
        'website' => $sig['website'],
        'github' => $sig['github'],
        'xProfile' => $sig['x_profile'],
        'comment' => $sig['comment'],
        'principlesVersion' => $sig['principles_version'],
        'date' => $sig['moderated_at'] ?? $sig['created_at'],
        'isFoundingSignatory' => is_founding_signatory($sig['created_at']),
    ], $signatures),
]);
