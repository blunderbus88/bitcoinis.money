# bitcoinis.money

A small, durable website whose primary purpose is to publish and preserve
**Our Bitcoin Principles** — a voluntary, version-pinned statement of what
Bitcoin is and what is worth preserving — alongside the Bitcoin White Paper.

This is a reference document site, not a marketing site, exchange, or
dashboard. The design goal: someone should be able to arrive here in twenty
years, understand exactly what was published and when, verify its integrity
independently, and see who voluntarily endorsed that exact text.

## Purpose

- Publish the Principles as a hash-pinned, version-archived document.
- Make the document approachable to nontechnical readers (Beginner Mode)
  without ever altering the canonical text.
- Let people voluntarily sign a specific, hash-pinned version of the
  Principles — never generic "membership" in anything.
- Publish the Bitcoin White Paper as the only other major content section.
- Stay simple, fast, privacy-respecting, and easy to self-host for decades.

## Architecture

Astro (server output) + SQLite + Markdown-as-content. No CMS, no build-time
content baking — the site reads its archived Markdown snapshot from disk on
every request, so publishing a new version is a matter of running a script,
not redeploying application code.

```
/
├── Principles.md                  # gitignored staging file for release-principles.mjs (not read by the site)
├── WhitePaper.md                  # Bitcoin white paper (Markdown transcription)
├── content/
│   ├── annotations.json           # Beginner Mode term dictionary
│   ├── principles-meta.json       # version/hash/date records, points at the current archive file
│   └── principles-archive/        # frozen snapshot of every published version — what the site actually reads
├── database/
│   └── schema.sql                 # signatures table only — never Principles content
├── public/
│   └── whitepaper/*.svg           # white paper diagrams, self-hosted
├── scripts/
│   ├── release-principles.mjs     # the only way to publish a new version
│   └── init-db.mjs
├── src/
│   ├── components/, layouts/, pages/
│   ├── lib/                       # principles.ts, whitepaper.ts, db.ts, validation.ts, ...
│   └── middleware.ts              # admin auth + security headers
└── docker/
```

**Why this stack:** Astro renders the archived Principles snapshot and
WhitePaper.md live from disk with minimal JavaScript shipped to the client
(Beginner Mode's toggle and tooltips work via a pure CSS `:has()`
checkbox-hack — no JS required for that feature at all). SQLite is enough
for a signature ledger; there is no reason to reach for a bigger database
for a single low-write-volume table. Nothing here needs a CMS: the Git
repository *is* the content-management system for the Principles.

## Local development

Requires Node.js 22+.

```bash
npm install
cp .env.example .env        # fill in ADMIN_PASSWORD and IP_HASH_SALT at minimum
npm run db:init              # creates database/signatures.db
npm run dev
```

If `content/principles-meta.json` has no `current` version yet (e.g. a fresh
fork with no release history), create a `Principles.md` at the repo root
first (hand-written, or copied from
[blunderbus88/Bitcoin](https://github.com/blunderbus88/Bitcoin)), then run
`npm run release-principles -- --version 1.0` to publish it.

The dev server runs at `http://localhost:4321`.

## Environment variables

All configuration comes from the environment (`.env` locally, real secrets
injected by your host in production). See `.env.example` for the full list:

| Variable | Purpose |
|---|---|
| `SITE_URL` | Canonical URL used for share links / Open Graph tags |
| `DATABASE_PATH` | Path to the SQLite signatures database |
| `ADMIN_USER` / `ADMIN_PASSWORD` | HTTP Basic Auth for `/admin/*` |
| `IP_HASH_SALT` | Salts the hashed IP used only for rate-limiting |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (spam prevention). If unset, verification is **skipped with a warning** — fine for local dev, required in production |

## How the Principles are rendered

`src/lib/principles.ts` reads the currently published snapshot —
`content/principles-archive/vX.Y.md`, as pointed to by
`content/principles-meta.json`'s `current` entry — directly from disk on
every request and renders it with `markdown-it` (`src/lib/markdown.ts`).
There is exactly one copy of "current" text in the whole system, so the
Markdown shown, downloaded, and hash-pinned for signing can never drift
apart from each other. There is no separate HTML copy anywhere.

**Beginner Mode** never touches the source Markdown. `content/annotations.json`
is a flat `{ "term": "definition" }` dictionary; a small `markdown-it` core
rule walks the *rendered token stream* (not the source text) after parsing
and wraps matching terms in `<span class="term" data-definition="…">`. The
dotted underline and hover/focus tooltip are pure CSS, gated on a checkbox
via `:has()` — the whole feature works with JavaScript disabled. A tiny
script only persists the on/off preference in `localStorage` across page
loads. To add or edit a definition, edit `content/annotations.json` — no
code changes needed.

## How hashes and versioning work

`content/principles-meta.json` records the currently published version
(`current`) and every prior version (`history`), each as
`{ version, hash, publishedAt, file }`. `content/principles-archive/vX.Y.md`
holds a frozen, byte-for-byte copy of the Markdown as it read at release
time — this is what `/principles`, `/principles.md`, and `/principles/vX.Y`
all serve, so a published version can never drift once it exists.

### Publishing a new version

`npm run release-principles` (`scripts/release-principles.mjs`) is the
**only** way to publish. It reads `Principles.md` (the gitignored staging
file at the repo root — edit it by hand, or let the sync workflow below
populate it from upstream), and:

1. Validates it (non-empty, has a top-level heading, no null bytes, sane
   size).
2. Computes its BLAKE2b hash.
3. Refuses to run if the hash hasn't changed since the last release (nothing
   to publish).
4. Freezes a copy into `content/principles-archive/vX.Y.md`.
5. Updates `content/principles-meta.json`, moving the previous `current`
   into `history`.

Two ways to invoke it:

- `npm run release-principles -- --version 1.1` — an operator names the
  version explicitly. Refuses to reuse a version number that's already been
  published (archive files are immutable once written). Use this for a
  deliberate release, e.g. a major bump.
- `npm run release-principles -- --auto` — derives the next version itself
  by bumping the minor version (`1.0` -> `1.1`, or `1.0` if nothing has ever
  been published). This is what `.github/workflows/sync-principles.yml`
  runs every 10 minutes after fetching the upstream text from
  `blunderbus88/Bitcoin@main` — since the script always no-ops on an
  unchanged hash, a version only actually gets published (and a commit only
  actually gets pushed) when the upstream text really changed.

Commit `content/principles-meta.json` and the new archive file together —
that commit *is* the release record. (`Principles.md` itself is never
committed — it's disposable input, not output.)

## How signatures are moderated

Submissions (`POST /api/sign`) are validated and normalized server-side
(`src/lib/validation.ts`), rate-limited by a salted IP hash
(`src/lib/rateLimit.ts`), optionally checked against Cloudflare Turnstile,
and inserted with `status = 'pending'`. They are **never** publicly visible
until approved.

`/admin/signatures` (protected by HTTP Basic Auth — see `ADMIN_USER` /
`ADMIN_PASSWORD`) lists the pending queue with Approve/Reject buttons that
post to `/api/admin/moderate`. Approved signatures appear on `/signatures`.

Every signature is permanently stored with the exact `principles_version`
and `principles_hash` it was submitted against (bound at page-render time
and re-verified server-side against the *current* published version before
insert — a stale or tampered hash is rejected). If the Principles are later
re-released, existing signatures keep pointing at the version they actually
endorsed; they are never silently carried forward.

**Future cryptographic signing:** the schema and submission flow are
deliberately simple enough to extend with a Bitcoin message-signing or
Nostr-event proof of the document hash later, without a schema migration
that breaks existing rows. Not implemented in this release.

## Security notes

- All signature-submission input is treated as hostile: validated,
  length-bounded, and normalized in `src/lib/validation.ts` before it ever
  reaches a SQL parameter (`better-sqlite3` prepared statements only — no
  string-built SQL) or gets rendered back to a page (Astro escapes
  `{expression}` output by default; nothing user-submitted is ever rendered
  with `set:html`).
- CSRF: Astro's `security.checkOrigin` (enabled in `astro.config.mjs`)
  rejects cross-origin state-changing requests.
- `/admin/*` and `/api/admin/*` are gated by HTTP Basic Auth in
  `src/middleware.ts`, which also sets baseline security headers (CSP,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) on every response.
- No Google Analytics, no tracking pixels, no third-party scripts except
  Cloudflare Turnstile — and that only loads if `TURNSTILE_SITE_KEY` is set.

## Deployment

Production runs on **SiteGround**, via Site Tools' Git tool (pulls from this
repo's `main` branch) and Node.js App Manager (Phusion Passenger — runs the
standalone server built by `npm run build`, no Docker or systemd involved).
See [`deploy/SITEGROUND_DEPLOY.md`](deploy/SITEGROUND_DEPLOY.md) for the full
runbook: one-time setup, the redeploy flow, and how to rebuild/restart
manually.

`npm run build` produces a standalone Node server at `dist/server/entry.mjs`
(via `@astrojs/node` in `standalone` mode, which also serves the static
assets in `dist/client/`) — it reads `process.env.PORT` / `process.env.HOST`
at runtime, and path resolution for `content/` and the database assumes the
process's working directory is the project root.

### Docker (local / alternate hosting)

```bash
cd docker
cp ../.env.example ../.env   # fill in real values
docker compose up --build -d
```

The signatures database lives in a named volume (`signatures-db`) so it
survives container rebuilds/redeploys. `WhitePaper.md`, `content/` (which
includes `principles-meta.json` and `principles-archive/`), and the white
paper diagrams are baked into the image at build time — to publish a new
Principles version, run `npm run release-principles`, commit the result
(`content/principles-meta.json` + the new archive file), and
rebuild/redeploy the image.

## Terminology note

This project is proceeding on a BLAKE2b proof-of-work chain. Where
necessary, the site distinguishes **BTC-BLAKE2B** from **BTC-SHA256**; the
Principles themselves simply say "Bitcoin" unless a distinction is required.
See the terminology note on the Principles page for the full wording.
