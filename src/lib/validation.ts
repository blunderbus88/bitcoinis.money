// All signature-submission input is treated as hostile. This module is the
// single choke point for validating and normalizing it before it ever
// reaches a SQL parameter or gets rendered back to a page.

export const PARTICIPANT_TYPES = [
  'Node Runner',
  'Miner',
  'Developer',
  'Business',
  'Author',
  'Educator',
  'Podcaster',
  'Pleb',
  'Other',
] as const;

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

// Removes ASCII control characters (0x00-0x1F, 0x7F) without relying on a
// regex escape range, which is avoided here for reliability of the pattern.
function stripControlChars(s: string): string {
  return Array.from(s)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return !(code <= 31 || code === 127);
    })
    .join('');
}

function clean(s: string): string {
  return stripControlChars(s).trim();
}

export function validateName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = clean(input);
  if (value.length < 1 || value.length > 100) return null;
  return value;
}

/** Accepts the values of a repeated `participant_type` field (e.g. FormData.getAll()). */
export function validateParticipantTypes(input: unknown[]): ParticipantType[] | null {
  const submitted = new Set(input.filter((v): v is string => typeof v === 'string'));
  const value = PARTICIPANT_TYPES.filter((t) => submitted.has(t));
  return value.length > 0 ? value : null;
}

/** Generic https:// URL validator for the free-text "website" field. */
export function validateUrl(input: unknown, maxLength = 300): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') return null;
  const value = clean(input);
  if (value.length === 0) return null;
  if (value.length > maxLength) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Accepts a bare GitHub username or a github.com profile URL; normalizes to a URL. */
export function validateGithub(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') return null;
  const value = clean(input);
  if (value.length === 0) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      if (host !== 'github.com') return null;
      return `https://github.com${url.pathname}`;
    } catch {
      return null;
    }
  }

  const username = value.replace(/^@/, '');
  if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) return null;
  return `https://github.com/${username}`;
}

/** Accepts a bare @handle or an x.com/twitter.com profile URL; normalizes to a URL. */
export function validateXProfile(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') return null;
  const value = clean(input);
  if (value.length === 0) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      if (host !== 'x.com' && host !== 'twitter.com') return null;
      return `https://x.com${url.pathname}`;
    } catch {
      return null;
    }
  }

  const handle = value.replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
  return `https://x.com/${handle}`;
}

/** Accepts an npub1... key, optionally prefixed with "nostr:". Stored as-is (not a URL). */
export function validateNostr(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') return null;
  const value = clean(input).replace(/^nostr:/i, '');
  if (!/^npub1[a-z0-9]{20,90}$/i.test(value)) return null;
  return value;
}

export function validateComment(input: unknown, maxLength = 280): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string') return null;
  const value = clean(input);
  if (value.length === 0) return null;
  if (value.length > maxLength) return null;
  return value;
}

export function validateVersion(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return /^\d+\.\d+(\.\d+)?$/.test(input) ? input : null;
}

export function validateHash(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  // BLAKE2b-512 hex digest (scripts/release-principles.mjs: createHash('blake2b512')) — 128 hex chars.
  return /^[a-f0-9]{128}$/i.test(input) ? input.toLowerCase() : null;
}
