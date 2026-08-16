<?php
// Privacy-conscious rate limiting: we never store raw IP addresses, only a
// salted SHA-256 hash, used solely to throttle abusive submission bursts.
// Ports src/lib/rateLimit.ts.

require_once __DIR__ . '/db.php';

const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

function rate_limit_hash_ip(string $ip): string {
    $config = require __DIR__ . '/config.php';
    $salt = $config['ip_hash_salt'] ?? '';
    if ($salt === '') {
        error_log('[rateLimit] ip_hash_salt is not set — using an unsalted hash. Set it in production.');
    }
    return hash('sha256', "{$salt}:{$ip}");
}

function rate_limit_client_ip(): string {
    // Behind a reverse proxy, X-Forwarded-For's first entry is the original client.
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if ($forwarded) {
        return trim(explode(',', $forwarded)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rate_limit_is_limited(string $ipHash): bool {
    $since = gmdate('Y-m-d\TH:i:s.v\Z', time() - RATE_LIMIT_WINDOW_MINUTES * 60);
    return db_count_recent_submissions($ipHash, $since) >= RATE_LIMIT_MAX_SUBMISSIONS;
}
