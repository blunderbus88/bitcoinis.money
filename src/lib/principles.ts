// Loads the currently published Principles (and any archived version) plus
// Beginner Mode annotations, and renders them.
//
// There is exactly one copy of "current" text: content/principles-archive/,
// pointed to by content/principles-meta.json's `current` entry. The site
// never reads a separate live-mirrored Principles.md at request time, so the
// displayed text and its BLAKE2b hash can never drift apart — the only way
// "current" changes is `npm run release-principles` (manual --version, or
// --auto from the sync-principles.yml workflow), which archives a new
// snapshot and updates principles-meta.json in the same step.

import { readFileSync, existsSync } from 'node:fs';
import { renderMarkdown, renderMarkdownWithAnnotations, type AnnotationDictionary } from './markdown';
import { PROJECT_ROOT } from './projectRoot';

const ROOT = `${PROJECT_ROOT}/`;

const META_PATH = `${ROOT}content/principles-meta.json`;
const ANNOTATIONS_PATH = `${ROOT}content/annotations.json`;

export interface VersionMeta {
  version: string;
  hash: string;
  publishedAt: string;
  file: string;
}

interface PrinciplesMeta {
  current: VersionMeta | null;
  history: VersionMeta[];
}

export interface RenderedPrinciples {
  version: string;
  hash: string;
  publishedAt: string;
  markdown: string;
  html: string;
  htmlBeginner: string;
}

function loadMeta(): PrinciplesMeta {
  if (!existsSync(META_PATH)) return { current: null, history: [] };
  return JSON.parse(readFileSync(META_PATH, 'utf-8'));
}

export function loadAnnotations(): AnnotationDictionary {
  if (!existsSync(ANNOTATIONS_PATH)) return {};
  const raw = JSON.parse(readFileSync(ANNOTATIONS_PATH, 'utf-8'));
  const { _readme, ...terms } = raw;
  return terms;
}

function renderVersion(entry: VersionMeta): RenderedPrinciples | null {
  const filePath = `${ROOT}${entry.file}`;
  if (!existsSync(filePath)) return null;

  const markdown = readFileSync(filePath, 'utf-8');
  const annotations = loadAnnotations();

  return {
    version: entry.version,
    hash: entry.hash,
    publishedAt: entry.publishedAt,
    markdown,
    html: renderMarkdown(markdown),
    htmlBeginner: renderMarkdownWithAnnotations(markdown, annotations),
  };
}

/**
 * The currently published Principles, read from its frozen archive snapshot.
 * Returns null if nothing has ever been published yet (a brand-new site
 * before its first release).
 */
export function getCurrentPrinciples(): RenderedPrinciples | null {
  const meta = loadMeta();
  if (!meta.current) return null;
  return renderVersion(meta.current);
}

/** A specific archived (or current) version by version string, e.g. "1.0". */
export function getPrinciplesVersion(version: string): RenderedPrinciples | null {
  const meta = loadMeta();
  const entry = [meta.current, ...meta.history].find((v) => v?.version === version);
  if (!entry) return null;
  return renderVersion(entry);
}

export function listVersions(): VersionMeta[] {
  const meta = loadMeta();
  return [meta.current, ...meta.history].filter((v): v is VersionMeta => v !== null);
}

export function isCurrentVersion(version: string): boolean {
  const meta = loadMeta();
  return meta.current?.version === version;
}
