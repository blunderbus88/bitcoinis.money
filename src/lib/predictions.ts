// Predictions.md is the single canonical copy of this content — same pattern
// as WhitePaper.md. It is authored upstream at blunderbus88/Bitcoin (which
// carries no per-entry metadata) and kept in sync here by
// .github/workflows/sync-predictions.yml. publishedAt/status for each
// prediction therefore live separately, in content/predictions-meta.json,
// keyed by prediction number — see that file's _readme and
// scripts/sync-predictions-meta.mjs. Unlike Principles.md there is no
// archive/versioning system for the prose itself: a prediction's original
// wording is never edited after publication (corrections are appended as
// dated "Updates" instead), so GitHub's own commit history is the
// provenance record. See Predictions.md's own intro and the repo README for
// the "we should be able to be wrong" rationale.

import { readFileSync } from 'node:fs';
import { renderMarkdown, markdownToPlainText } from './markdown';
import { PROJECT_ROOT } from './projectRoot';

const PREDICTIONS_PATH = `${PROJECT_ROOT}/Predictions.md`;
const PREDICTIONS_META_PATH = `${PROJECT_ROOT}/content/predictions-meta.json`;

export type PredictionStatus = 'open' | 'partially-fulfilled' | 'fulfilled' | 'not-fulfilled';

export const STATUS_LABELS: Record<PredictionStatus, string> = {
  open: 'Pending',
  'partially-fulfilled': 'Partially Fulfilled',
  fulfilled: 'Fulfilled',
  'not-fulfilled': 'Not Fulfilled',
};

export interface Prediction {
  number: number;
  slug: string;
  title: string;
  publishedAt: string;
  status: PredictionStatus;
  statusLabel: string;
  bodyHtml: string;
  bodyPlainText: string;
  updatesHtml: string | null;
}

export interface PredictionsDocument {
  introHtml: string;
  introPlainText: string;
  predictions: Prediction[];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[’'".]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface PredictionMetaEntry {
  publishedAt: string;
  status: PredictionStatus;
}

function readPredictionsMeta(): Record<string, PredictionMetaEntry> {
  const { _readme, ...entries } = JSON.parse(readFileSync(PREDICTIONS_META_PATH, 'utf-8'));
  return entries;
}

export function getPredictionsMarkdown(): string {
  return readFileSync(PREDICTIONS_PATH, 'utf-8');
}

export function getPredictions(): PredictionsDocument {
  const source = getPredictionsMarkdown();
  const meta = readPredictionsMeta();

  // The file opens with an H1 + intro prose, then one H2 section per
  // prediction. Split on H2 boundaries to isolate each prediction's text.
  const sections = source.split(/\n(?=## )/);
  const introSource = sections[0];
  const predictionSources = sections.slice(1);

  const predictions: Prediction[] = predictionSources.map((raw) => {
    const headingMatch = raw.match(/^## (\d+)\.\s*(.+?)\s*\n/);
    if (!headingMatch) {
      throw new Error(`Predictions.md: section is missing a "## N. Title" heading:\n${raw.slice(0, 80)}`);
    }
    const [, numberStr, title] = headingMatch;
    const rest = raw.slice(headingMatch[0].length);

    const [beforeUpdates, updatesSource] = rest.split(/\n### Updates\n/);
    const body = beforeUpdates.trim();

    const entryMeta = meta[numberStr];
    if (!entryMeta) {
      throw new Error(
        `content/predictions-meta.json: no entry for prediction ${numberStr} — run scripts/sync-predictions-meta.mjs`
      );
    }
    const { publishedAt, status } = entryMeta;

    return {
      number: Number(numberStr),
      slug: slugify(title),
      title,
      publishedAt,
      status,
      statusLabel: STATUS_LABELS[status] ?? status,
      bodyHtml: renderMarkdown(body),
      bodyPlainText: markdownToPlainText(body),
      updatesHtml: updatesSource ? renderMarkdown(updatesSource.trim()) : null,
    };
  });

  return {
    introHtml: renderMarkdown(introSource.trim()),
    introPlainText: markdownToPlainText(introSource.trim()),
    predictions,
  };
}
