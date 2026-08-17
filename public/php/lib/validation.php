<?php
// All signature-submission input is treated as hostile. This module is the
// single choke point for validating and normalizing it before it ever
// reaches a SQL parameter or gets echoed back into a page.
// Ports src/lib/validation.ts.

const PARTICIPANT_TYPES = [
    'Node Runner', 'Miner', 'Developer', 'Business', 'Author', 'Educator', 'Podcaster', 'Pleb', 'Other',
];

function validation_clean(string $s): string {
    // Strips ASCII control characters (0x00-0x1F, 0x7F).
    $stripped = preg_replace('/[\x00-\x1F\x7F]/u', '', $s) ?? '';
    return trim($stripped);
}

function validate_name($input): ?string {
    if (!is_string($input)) return null;
    $value = validation_clean($input);
    $len = mb_strlen($value);
    if ($len < 1 || $len > 100) return null;
    return $value;
}

/**
 * Accepts the values of a repeated participant_type[] field. PHP only
 * arrays same-named fields when the HTML name ends in [] (see endorse.astro
 * / admin/edit.php) — a hostile client posting the field without brackets
 * would otherwise hand this a bare string, so normalize defensively rather
 * than assume the shape.
 */
function validate_participant_types($input): ?array {
    $list = is_array($input) ? $input : [$input];
    $submitted = array_filter($list, fn($v) => is_string($v));
    $value = array_values(array_filter(PARTICIPANT_TYPES, fn($t) => in_array($t, $submitted, true)));
    return count($value) > 0 ? $value : null;
}

/** Generic https://(or http://) URL validator for the free-text "website" field. */
function validate_url($input, int $maxLength = 300): ?string {
    if ($input === null || $input === '') return null;
    if (!is_string($input)) return null;
    $value = validation_clean($input);
    if ($value === '' || mb_strlen($value) > $maxLength) return null;
    $parts = parse_url($value);
    if ($parts === false || !isset($parts['scheme'], $parts['host'])) return null;
    if (!in_array(strtolower($parts['scheme']), ['http', 'https'], true)) return null;
    return $value;
}

/** Accepts a bare GitHub username or a github.com profile URL; normalizes to a URL. */
function validate_github($input): ?string {
    if ($input === null || $input === '') return null;
    if (!is_string($input)) return null;
    $value = validation_clean($input);
    if ($value === '') return null;

    if (preg_match('#^https?://#i', $value)) {
        $parts = parse_url($value);
        if ($parts === false || !isset($parts['host'])) return null;
        $host = strtolower(preg_replace('/^www\./i', '', $parts['host']));
        if ($host !== 'github.com') return null;
        return 'https://github.com' . ($parts['path'] ?? '');
    }

    $username = preg_replace('/^@/', '', $value);
    if (!preg_match('/^[A-Za-z0-9-]{1,39}$/', $username)) return null;
    return "https://github.com/{$username}";
}

/** Accepts a bare @handle or an x.com/twitter.com profile URL; normalizes to a URL. */
function validate_x_profile($input): ?string {
    if ($input === null || $input === '') return null;
    if (!is_string($input)) return null;
    $value = validation_clean($input);
    if ($value === '') return null;

    if (preg_match('#^https?://#i', $value)) {
        $parts = parse_url($value);
        if ($parts === false || !isset($parts['host'])) return null;
        $host = strtolower(preg_replace('/^www\./i', '', $parts['host']));
        if ($host !== 'x.com' && $host !== 'twitter.com') return null;
        return 'https://x.com' . ($parts['path'] ?? '');
    }

    $handle = preg_replace('/^@/', '', $value);
    if (!preg_match('/^[A-Za-z0-9_]{1,15}$/', $handle)) return null;
    return "https://x.com/{$handle}";
}

/** Accepts an npub1... key, optionally prefixed with "nostr:". Stored as-is (not a URL). */
function validate_nostr($input): ?string {
    if ($input === null || $input === '') return null;
    if (!is_string($input)) return null;
    $value = preg_replace('/^nostr:/i', '', validation_clean($input));
    if (!preg_match('/^npub1[a-z0-9]{20,90}$/i', $value)) return null;
    return $value;
}

function validate_comment($input, int $maxLength = 500): ?string {
    if ($input === null || $input === '') return null;
    if (!is_string($input)) return null;
    $value = validation_clean($input);
    if ($value === '' || mb_strlen($value) > $maxLength) return null;
    return $value;
}

function validate_version($input): ?string {
    if (!is_string($input)) return null;
    return preg_match('/^\d+\.\d+(\.\d+)?$/', $input) ? $input : null;
}

function validate_hash($input): ?string {
    if (!is_string($input)) return null;
    // BLAKE2b-512 hex digest (scripts/release-principles.mjs: createHash('blake2b512')) — 128 hex chars.
    return preg_match('/^[a-f0-9]{128}$/i', $input) ? strtolower($input) : null;
}
