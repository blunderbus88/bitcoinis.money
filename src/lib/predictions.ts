// Predictions.md is the single canonical copy of this content — same pattern
// as WhitePaper.md. Unlike Principles.md there is no archive/versioning
// system: a prediction's original wording is never edited after publication
// (corrections are appended as dated "Updates" instead), so GitHub's own
// commit history is the provenance record. See Predictions.md's own intro
// and the repo README for the "we should be able to be wrong" rationale.

import { readFileSync } from 'node:fs';
import { renderMarkdown, markdownToPlainText } from './markdown';
import { PROJECT_ROOT } from './projectRoot';

const PREDICTIONS_PATH = `${PROJECT_ROOT}/Predictions.md`;

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
  predictions: Prediction[];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[’'".]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readMetaComment(section: string, key: string): string | null {
  const match = section.match(new RegExp(`<!--\\s*${key}:\\s*(.+?)\\s*-->`));
  return match ? match[1].trim() : null;
}

function stripMetaComments(section: string): string {
  return section.replace(/<!--\s*(published|status):.+?-->\n?/g, '');
}

export function getPredictionsMarkdown(): string {
  return readFileSync(PREDICTIONS_PATH, 'utf-8');
}

export function getPredictions(): PredictionsDocument {
  const source = getPredictionsMarkdown();

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

    const publishedAt = readMetaComment(beforeUpdates, 'published');
    const statusRaw = readMetaComment(beforeUpdates, 'status');
    if (!publishedAt || !statusRaw) {
      throw new Error(`Predictions.md: prediction ${numberStr} is missing published/status metadata`);
    }
    const status = statusRaw as PredictionStatus;

    const body = stripMetaComments(beforeUpdates).trim();

    return {
      number: Number(numberStr),
      slug: slugify(title),
      title,
      publishedAt,
      status,
      statusLabel: STATUS_LABELS[status] ?? statusRaw,
      bodyHtml: renderMarkdown(body),
      bodyPlainText: markdownToPlainText(body),
      updatesHtml: updatesSource ? renderMarkdown(updatesSource.trim()) : null,
    };
  });

  return {
    introHtml: renderMarkdown(introSource.trim()),
    predictions,
  };
}
