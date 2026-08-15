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
  participantType: ParticipantType;
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
  participant_type: ParticipantType;
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
  const info = stmt.run(sig);
  return Number(info.lastInsertRowid);
}

export function listApprovedSignatures(participantType?: string): Signature[] {
  const db = getDb();
  if (participantType && participantType !== 'All') {
    return db
      .prepare(`SELECT * FROM signatures WHERE status = 'approved' AND participant_type = ? ORDER BY moderated_at DESC`)
      .all(participantType) as Signature[];
  }
  return db.prepare(`SELECT * FROM signatures WHERE status = 'approved' ORDER BY moderated_at DESC`).all() as Signature[];
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
