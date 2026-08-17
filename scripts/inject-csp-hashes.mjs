#!/usr/bin/env node
// Astro inlines page-local <script> blocks with no imports directly into
// the built HTML (rather than emitting them as separate /_astro/*.js
// files), and dist/.htaccess's CSP has no 'unsafe-inline' — a static site
// has no per-request nonce to fall back on. So instead, this scans the
// built output for every distinct inline <script> body and allowlists each
// one by its SHA-256 hash, which CSP treats as equivalent to a nonce for
// content that's fixed at build time.
//
// Run after `astro build`, before deploying dist/.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const htaccessPath = path.join(distDir, '.htaccess');
const placeholder = '{{INLINE_SCRIPT_HASHES}}';

// Matches <script ...>body</script> tags that have no src= attribute —
// external scripts (e.g. the Turnstile widget) are already covered by the
// existing 'self' / challenges.cloudflare.com sources and don't need a hash.
const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html') || entry.endsWith('.php')) out.push(full);
  }
  return out;
}

const hashes = new Set();

for (const file of walk(distDir)) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(INLINE_SCRIPT_RE)) {
    const body = match[1];
    if (!body.trim()) continue;
    const hash = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.add(`'sha256-${hash}'`);
  }
}

const htaccess = readFileSync(htaccessPath, 'utf8');
if (!htaccess.includes(placeholder)) {
  throw new Error(`${placeholder} not found in ${htaccessPath}`);
}
writeFileSync(htaccessPath, htaccess.replace(placeholder, [...hashes].sort().join(' ')));

console.log(`Injected ${hashes.size} inline-script hash(es) into dist/.htaccess`);
