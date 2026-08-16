// Thin, parameterized-query-only wrapper around the signatures database.
// No arbitrary/dynamic SQL is ever built from user input.

import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PROJECT_ROOT } from './projectRoot';

const dbPath = resolve(PROJECT_ROOT, process.env.DATABASE_PATH ?? './database/signatures.db');

let instance: Database.Database | null = null;

function getDb(): Database.Database {
  if (instance) return instance;

  mkdirSync(dirname(dbPath), { recursive: true });
  instance = new Database(dbPath);
  instance.pragma('journal_mode = WAL');

  // Idempotent — safe to run on every boot, never mutates existing rows.
  const schemaPath = resolve(PROJECT_ROOT, 'database/schema.sql');
  if (existsSync(schemaPath)) {
    instance.exec(readFileSync(schemaPath, 'utf-8'));
  }

  return instance;
}

export type ParticipantType =
  | 'Node Runner'
  | 'Miner'
  | 'Developer'
  | 'Business'
  | 'Author'
  | 'Educator'
  | 'Podcaster'
  | 'Pleb'
  | 'Other';

export interface NewSignature {
  name: string;
  participantTypes: ParticipantType[];
  website: string | null;
  github: string | null;
  xProfile: string | null;
  nostr: string | null;
  comment: string | null;
  principlesVersion: string;
  principlesHash: string;
  ipHash: string | null;
}

export interface Signature {
  id: number;
  name: string;
  /** Comma-separated list of participant types; use parseParticipantTypes() to read it. */
  participant_type: string;
  website: string | null;
  github: string | null;
  x_profile: string | null;
  nostr: string | null;
  comment: string | null;
  principles_version: string;
  principles_hash: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  moderated_at: string | null;
}

/** Splits a stored comma-separated participant_type value back into individual types. */
export function parseParticipantTypes(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function insertSignature(sig: NewSignature): number {
  const stmt = getDb().prepare(`
    INSERT INTO signatures (
      name, participant_type, website, github, x_profile, nostr, comment,
      principles_version, principles_hash, status, ip_hash
    ) VALUES (
      @name, @participantType, @website, @github, @xProfile, @nostr, @comment,
      @principlesVersion, @principlesHash, 'pending', @ipHash
    )
  `);
  const info = stmt.run({ ...sig, participantType: sig.participantTypes.join(',') });
  return Number(info.lastInsertRowid);
}

export function listApprovedSignatures(participantType?: string): Signature[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM signatures WHERE status = 'approved' ORDER BY moderated_at DESC`)
    .all() as Signature[];
  if (participantType && participantType !== 'All') {
    return rows.filter((r) => parseParticipantTypes(r.participant_type).includes(participantType));
  }
  return rows;
}

export function countApprovedSignatures(): number {
  const row = getDb().prepare(`SELECT COUNT(*) as n FROM signatures WHERE status = 'approved'`).get() as { n: number };
  return row.n;
}

export function listPendingSignatures(): Signature[] {
  return getDb().prepare(`SELECT * FROM signatures WHERE status = 'pending' ORDER BY created_at ASC`).all() as Signature[];
}

export function listAllSignaturesForAdmin(): Signature[] {
  return getDb().prepare(`SELECT * FROM signatures ORDER BY created_at DESC`).all() as Signature[];
}

export function moderateSignature(id: number, status: 'approved' | 'rejected'): void {
  getDb()
    .prepare(`UPDATE signatures SET status = ?, moderated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(status, id);
}

/** Recent submission count from the same hashed IP, for rate limiting. */
export function countRecentSubmissions(ipHash: string, sinceIso: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) as n FROM signatures WHERE ip_hash = ? AND created_at >= ?`)
    .get(ipHash, sinceIso) as { n: number };
  return row.n;
}
