#!/usr/bin/env node
//
// Ensures every prediction present in Predictions.md has a corresponding
// entry in content/predictions-meta.json (publishedAt + status).
// Predictions.md is synced from blunderbus88/Bitcoin and carries no
// per-entry metadata of its own — see src/lib/predictions.ts. Run by
// sync-predictions.yml after each fetch; any newly-appeared prediction
// number is recorded here with today's date and status "open". Existing
// entries (including status changes made by hand) are never touched.
//
// Usage:
//   node scripts/sync-predictions-meta.mjs

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const predictionsPath = resolve(root, 'Predictions.md');
const metaPath = resolve(root, 'content/predictions-meta.json');

function fail(message) {
  console.error(`\nerror: ${message}\n`);
  process.exit(1);
}

if (!existsSync(predictionsPath)) {
  fail(`Predictions.md not found at ${predictionsPath}`);
}

const content = readFileSync(predictionsPath, 'utf-8');
const numbers = [...content.matchAll(/^## (\d+)\.\s*/gm)].map((m) => m[1]);

if (numbers.length === 0) {
  fail('no "## N. Title" predictions found in Predictions.md');
}

const meta = existsSync(metaPath)
  ? JSON.parse(readFileSync(metaPath, 'utf-8'))
  : { _readme: 'publishedAt/status for each prediction, keyed by its number heading in Predictions.md.' };

const today = new Date().toISOString().slice(0, 10);
const added = [];

for (const n of numbers) {
  if (!meta[n]) {
    meta[n] = { publishedAt: today, status: 'open' };
    added.push(n);
  }
}

if (added.length > 0) {
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  console.log(`Added metadata for new prediction(s): ${added.join(', ')}`);
} else {
  console.log('No new predictions.');
}
