#!/usr/bin/env node
//
// Publishes the current contents of Principles.md as an official, hash-pinned
// version. This is the ONLY supported way to change which version of the
// Principles is "current" on the site.
//
// Usage:
//   npm run release-principles -- --version 1.0
//   npm run release-principles -- --auto
//
// What it does:
//   1. Validates Principles.md (basic sanity checks).
//   2. Computes its BLAKE2b hash.
//   3. Refuses to run if nothing has changed since the last release.
//   4. Refuses to overwrite an already-published version (archive files are
//      immutable once written).
//   5. Freezes a copy into content/principles-archive/v<version>.md.
//   6. Records the new version as "current" in content/principles-meta.json,
//      moving the previous current version into history.
//
// --version requires an operator to name the version explicitly (used for
// deliberate releases, e.g. major bumps).
//
// --auto derives the next version itself by bumping the minor version of the
// last-published version (1.0 -> 1.1, defaulting to 1.0 if nothing has ever
// been published). It's meant to be invoked by the sync-principles.yml
// workflow, and only ever does anything when the hash actually changed —
// this script always refuses to publish when the content hasn't changed
// (step 3 above), so a version bump only happens on a real content change.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const principlesPath = resolve(root, 'Principles.md');
const metaPath = resolve(root, 'content/principles-meta.json');
const archiveDir = resolve(root, 'content/principles-archive');

function fail(message) {
  console.error(`\nerror: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--version') {
      out.version = argv[i + 1];
      i++;
    } else if (argv[i] === '--auto') {
      out.auto = true;
    }
  }
  return out;
}

function nextAutoVersion(current) {
  if (!current) return '1.0';
  const [major, minor] = current.version.split('.');
  return `${major}.${Number(minor) + 1}`;
}

const args = parseArgs(process.argv.slice(2));

if (!args.version && !args.auto) {
  fail(
    'a version is required.\n\n' +
      '  Usage: npm run release-principles -- --version 1.0\n' +
      '         npm run release-principles -- --auto\n\n' +
      'This is deliberate: publishing a new version is an explicit operator\n' +
      'action (or an explicit --auto invocation), not something that happens\n' +
      'silently.'
  );
}

if (args.version && args.auto) {
  fail('--version and --auto are mutually exclusive.');
}

if (args.version && !/^\d+\.\d+(\.\d+)?$/.test(args.version)) {
  fail(`version "${args.version}" doesn't look like a version number (expected e.g. "1.0" or "1.0.1").`);
}

if (!existsSync(principlesPath)) {
  fail(`Principles.md not found at ${principlesPath}`);
}

const content = readFileSync(principlesPath, 'utf-8');

// --- 1. Validate ---------------------------------------------------------

const NULL_BYTE = String.fromCharCode(0);
const problems = [];
if (content.trim().length === 0) problems.push('Principles.md is empty.');
if (!/^#\s+\S/m.test(content)) problems.push('Principles.md has no top-level heading (a line starting with "# ").');
if (content.includes(NULL_BYTE)) problems.push('Principles.md contains a null byte — likely a corrupted file.');
if (content.length > 2_000_000) problems.push('Principles.md is implausibly large (>2MB) — refusing as a safety check.');

if (problems.length > 0) {
  fail(`Principles.md failed validation:\n  - ${problems.join('\n  - ')}`);
}

// --- 2. Hash ---------------------------------------------------------------

const hash = createHash('blake2b512').update(content, 'utf-8').digest('hex');

// --- 3. Load / initialize metadata -----------------------------------------

let meta = { current: null, history: [] };
if (existsSync(metaPath)) {
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
  } catch (err) {
    fail(`could not parse ${metaPath}: ${err.message}`);
  }
}

if (meta.current && meta.current.hash === hash) {
  console.log(
    `\nNo changes since the last published version (v${meta.current.version}, ${hash.slice(0, 12)}…).\n` +
      'Edit Principles.md if you intend to publish a new version.\n'
  );
  process.exit(0);
}

const version = args.auto ? nextAutoVersion(meta.current) : args.version;

// --- 4. Refuse to overwrite an existing release -----------------------------

const archiveFile = resolve(archiveDir, `v${version}.md`);
const alreadyPublished =
  existsSync(archiveFile) ||
  meta.history.some((v) => v.version === version) ||
  (meta.current && meta.current.version === version);

if (alreadyPublished) {
  fail(
    `version "${version}" has already been published and its archive is immutable.\n` +
      'Choose a new version number for this change (e.g. bump the minor version).'
  );
}

// --- 5. Freeze archive copy --------------------------------------------------

writeFileSync(archiveFile, content, 'utf-8');

// --- 6. Update metadata -------------------------------------------------------

const publishedAt = new Date().toISOString();

if (meta.current) {
  meta.history.unshift(meta.current);
}

meta.current = {
  version,
  hash,
  publishedAt,
  file: `content/principles-archive/v${version}.md`,
};

writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');

console.log(
  `\nPublished Principles v${version}\n` +
    `  BLAKE2b:   ${hash}\n` +
    `  Date:      ${publishedAt}\n` +
    `  Archived:  content/principles-archive/v${version}.md\n\n` +
    'Commit Principles.md, content/principles-meta.json, and the new archive\n' +
    'file together so the release is captured in version control.\n'
);
