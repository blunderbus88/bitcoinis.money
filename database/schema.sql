-- Signatures schema.
--
-- Principles content, versions, and hashes live in Principles.md and
-- content/principles-meta.json, NOT in this database. This database only
-- stores voluntary personal endorsements of specific Principles versions.

CREATE TABLE IF NOT EXISTS signatures (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT    NOT NULL,
  participant_type    TEXT    NOT NULL,
  website             TEXT,
  github              TEXT,
  x_profile           TEXT,
  nostr               TEXT,
  comment             TEXT,
  principles_version  TEXT    NOT NULL,
  principles_hash     TEXT    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_hash             TEXT,
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  moderated_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_signatures_status ON signatures (status);
CREATE INDEX IF NOT EXISTS idx_signatures_version ON signatures (principles_version);
CREATE INDEX IF NOT EXISTS idx_signatures_created_at ON signatures (created_at);
