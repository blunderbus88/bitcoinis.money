<?php
// Thin, parameterized-query-only wrapper around the signatures database.
// No arbitrary/dynamic SQL is ever built from user input.
// Ports src/lib/db.ts.

$config = require __DIR__ . '/config.php';

function db_get(): PDO {
    static $instance = null;
    if ($instance !== null) return $instance;

    global $config;
    $dbPath = $config['database_path'];
    @mkdir(dirname($dbPath), 0755, true);

    $instance = new PDO('sqlite:' . $dbPath);
    $instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $instance->exec('PRAGMA journal_mode = WAL');

    // Idempotent — safe to run on every request, never mutates existing rows.
    $schemaPath = dirname($dbPath) . '/schema.sql';
    if (file_exists($schemaPath)) {
        $instance->exec(file_get_contents($schemaPath));
    }

    return $instance;
}

/** Splits a stored comma-separated participant_type value back into individual types. */
function db_parse_participant_types(string $raw): array {
    return array_values(array_filter(array_map('trim', explode(',', $raw)), fn($s) => $s !== ''));
}

// The hard fork cutoff, in the same UTC ISO-8601 format `created_at` is
// stored in (see db_insert_signature's 'now' default and rateLimit.php's
// gmdate calls) — comparable directly against created_at as plain strings,
// no timezone parsing involved on either side.
const FOUNDING_SIGNATORY_CUTOFF = '2026-09-01T00:00:00.000Z';

/**
 * Derived purely from the server-set created_at (never moderated_at, and
 * never anything the submitter can influence) — there is no persisted
 * "founder" column. Anyone who submitted before the hard fork cutoff
 * qualifies, retroactively, with no migration needed.
 */
function is_founding_signatory(string $createdAt): bool {
    return $createdAt < FOUNDING_SIGNATORY_CUTOFF;
}

function db_insert_signature(array $sig): int {
    $stmt = db_get()->prepare('
        INSERT INTO signatures (
            name, participant_type, website, github, x_profile, nostr, comment,
            principles_version, principles_hash, status, ip_hash
        ) VALUES (
            :name, :participant_type, :website, :github, :x_profile, :nostr, :comment,
            :principles_version, :principles_hash, \'pending\', :ip_hash
        )
    ');
    $stmt->execute([
        ':name' => $sig['name'],
        ':participant_type' => implode(',', $sig['participantTypes']),
        ':website' => $sig['website'],
        ':github' => $sig['github'],
        ':x_profile' => $sig['xProfile'],
        ':nostr' => $sig['nostr'],
        ':comment' => $sig['comment'],
        ':principles_version' => $sig['principlesVersion'],
        ':principles_hash' => $sig['principlesHash'],
        ':ip_hash' => $sig['ipHash'],
    ]);
    return (int) db_get()->lastInsertId();
}

function db_list_approved_signatures(?string $participantType = null): array {
    $rows = db_get()
        ->query("SELECT * FROM signatures WHERE status = 'approved' ORDER BY moderated_at DESC")
        ->fetchAll(PDO::FETCH_ASSOC);
    if ($participantType && $participantType !== 'All') {
        return array_values(array_filter($rows, fn($r) => in_array($participantType, db_parse_participant_types($r['participant_type']), true)));
    }
    return $rows;
}

function db_count_approved_signatures(): int {
    return (int) db_get()->query("SELECT COUNT(*) FROM signatures WHERE status = 'approved'")->fetchColumn();
}

function db_list_pending_signatures(): array {
    return db_get()
        ->query("SELECT * FROM signatures WHERE status = 'pending' ORDER BY created_at ASC")
        ->fetchAll(PDO::FETCH_ASSOC);
}

function db_list_all_signatures_for_admin(): array {
    return db_get()
        ->query('SELECT * FROM signatures ORDER BY created_at DESC')
        ->fetchAll(PDO::FETCH_ASSOC);
}

function db_get_signature_by_id(int $id): ?array {
    $stmt = db_get()->prepare('SELECT * FROM signatures WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row === false ? null : $row;
}

function db_moderate_signature(int $id, string $status): void {
    $stmt = db_get()->prepare("UPDATE signatures SET status = ?, moderated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?");
    $stmt->execute([$status, $id]);
}

function db_update_signature_fields(int $id, array $fields): void {
    $stmt = db_get()->prepare('
        UPDATE signatures
        SET name = :name, participant_type = :participant_type, website = :website,
            github = :github, x_profile = :x_profile, nostr = :nostr, comment = :comment
        WHERE id = :id
    ');
    $stmt->execute([
        ':name' => $fields['name'],
        ':participant_type' => implode(',', $fields['participantTypes']),
        ':website' => $fields['website'],
        ':github' => $fields['github'],
        ':x_profile' => $fields['xProfile'],
        ':nostr' => $fields['nostr'],
        ':comment' => $fields['comment'],
        ':id' => $id,
    ]);
}

/** Permanently removes a submission (any status). Unlike rejecting, this cannot be undone. */
function db_delete_signature(int $id): void {
    $stmt = db_get()->prepare('DELETE FROM signatures WHERE id = ?');
    $stmt->execute([$id]);
}

/** Recent submission count from the same hashed IP, for rate limiting. */
function db_count_recent_submissions(string $ipHash, string $sinceIso): int {
    $stmt = db_get()->prepare('SELECT COUNT(*) FROM signatures WHERE ip_hash = ? AND created_at >= ?');
    $stmt->execute([$ipHash, $sinceIso]);
    return (int) $stmt->fetchColumn();
}
