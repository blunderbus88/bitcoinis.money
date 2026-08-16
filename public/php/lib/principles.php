<?php
// Only what the PHP side needs: the currently published version + hash, to
// re-validate a submission server-side against content/principles-meta.json
// (never trust the version/hash a form submits). Full Markdown rendering
// stays in Astro (src/lib/principles.ts) since that only runs at build time.

function principles_get_current(): ?array {
    $metaPath = dirname(__DIR__, 3) . '/content/principles-meta.json';
    if (!file_exists($metaPath)) return null;

    $meta = json_decode(file_get_contents($metaPath), true);
    $current = $meta['current'] ?? null;
    if (!$current) return null;

    return ['version' => $current['version'], 'hash' => $current['hash']];
}
