#!/usr/bin/env node
// Creates the SQLite database file and applies database/schema.sql.
// Safe to re-run: CREATE TABLE IF NOT EXISTS means existing data is untouched.

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dbPath = resolve(root, process.env.DATABASE_PATH ?? './database/signatures.db');
const schemaPath = resolve(root, 'database/schema.sql');

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(readFileSync(schemaPath, 'utf-8'));
db.close();

console.log(`Database ready at ${dbPath}`);
