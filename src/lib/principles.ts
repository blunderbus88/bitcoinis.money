// Loads Principles.md (the single canonical source) plus its version
// metadata and Beginner Mode annotation dictionary, and renders them.
//
// Principles.md and content/*.json are read directly from disk on each
// request. There is no build-time snapshot and no separate HTML copy —
// editing Principles.md and running `npm run release-principles` is the
// only way the published content changes.

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { renderMarkdown, renderMarkdownWithAnnotations, type AnnotationDictionary } from './markdown';
import { PROJECT_ROOT } from './projectRoot';

const ROOT = `${PROJECT_ROOT}/`;

const PRINCIPLES_PATH = `${ROOT}Principles.md`;
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

function blake2b(text: string): string {
  return createHash('blake2b512').update(text, 'utf-8').digest('hex');
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

/**
 * The currently published Principles: always rendered live from the root
 * Principles.md, which is the canonical source of truth. If Principles.md
 * has been edited but not yet released, its live hash will differ from
 * meta.current.hash — callers that need the *published* guarantee should
 * treat meta.current as authoritative for version/hash/date display.
 */
export function getCurrentPrinciples(): RenderedPrinciples {
  const markdown = readFileSync(PRINCIPLES_PATH, 'utf-8');
  const meta = loadMeta();
  const annotations = loadAnnotations();

  const liveHash = blake2b(markdown);
  const published = meta.current;

  return {
    version: published?.version ?? 'unreleased',
    hash: published?.hash ?? liveHash,
    publishedAt: published?.publishedAt ?? '',
    markdown,
    html: renderMarkdown(markdown),
    htmlBeginner: renderMarkdownWithAnnotations(markdown, annotations),
  };
}

/**
 * A specific archived (or current) version by version string, e.g. "1.0".
 * Reads the frozen snapshot in content/principles-archive/, never the live
 * root file, so archived versions can never drift.
 */
export function getPrinciplesVersion(version: string): RenderedPrinciples | null {
  const meta = loadMeta();
  const entry = [meta.current, ...meta.history].find((v) => v?.version === version);
  if (!entry) return null;

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

export function listVersions(): VersionMeta[] {
  const meta = loadMeta();
  return [meta.current, ...meta.history].filter((v): v is VersionMeta => v !== null);
}

export function isCurrentVersion(version: string): boolean {
  const meta = loadMeta();
  return meta.current?.version === version;
}

export function hasAnyReleasedVersion(): boolean {
  return loadMeta().current !== null;
}
