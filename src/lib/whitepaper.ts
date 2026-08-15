// The White Paper is a static reference document — unlike Principles.md it
// carries no signature/versioning system, so this loader is intentionally
// minimal: read WhitePaper.md, render it, done.

import { readFileSync } from 'node:fs';
import { renderMarkdown } from './markdown';
import { PROJECT_ROOT } from './projectRoot';

const WHITEPAPER_PATH = `${PROJECT_ROOT}/WhitePaper.md`;

export function getWhitePaperMarkdown(): string {
  return readFileSync(WHITEPAPER_PATH, 'utf-8');
}

export function getWhitePaperHtml(): string {
  return renderMarkdown(getWhitePaperMarkdown());
}
