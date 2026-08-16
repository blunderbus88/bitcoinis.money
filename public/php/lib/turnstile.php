<?php
// Cloudflare Turnstile *verification* only (the secret-key side). The site
// key is public and stays build-time in Astro (src/lib/turnstile.ts,
// embedded in the static /endorse page) — no need to round-trip it through
// PHP. If turnstile_secret_key isn't configured, verification is skipped in
// development with a loud warning — production deployments must set it.
// Ports the verification half of src/lib/turnstile.ts.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function turnstile_verify(?string $token, string $remoteIp): bool {
    $config = require __DIR__ . '/config.php';
    $secretKey = $config['turnstile_secret_key'] ?? '';

    if ($secretKey === '') {
        error_log('[turnstile] turnstile_secret_key is not set — skipping verification (development only).');
        return true;
    }

    if (!$token) return false;

    $body = http_build_query(['secret' => $secretKey, 'response' => $token, 'remoteip' => $remoteIp]);

    try {
        if (function_exists('curl_init')) {
            $ch = curl_init(TURNSTILE_VERIFY_URL);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
            ]);
            $response = curl_exec($ch);
            $failed = $response === false;
            curl_close($ch);
            if ($failed) return false;
        } else {
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                    'content' => $body,
                    'timeout' => 10,
                ],
            ]);
            $response = @file_get_contents(TURNSTILE_VERIFY_URL, false, $context);
            if ($response === false) return false;
        }

        $data = json_decode($response, true);
        return isset($data['success']) && $data['success'] === true;
    } catch (\Throwable $err) {
        error_log('[turnstile] verification request failed: ' . $err->getMessage());
        return false;
    }
}
