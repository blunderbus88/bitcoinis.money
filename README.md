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

Astro (**static output**) for content, plain PHP for the handful of
genuinely dynamic pieces (signature submission + admin moderation), SQLite
for the signature ledger, Markdown-as-content for everything else. No CMS —
the Git repository *is* the content-management system for the Principles.
Content pages are prerendered at build time, which is safe here because
content only ever changes via a script + commit + redeploy, never live
in-place edits.

```
/
├── Principles.md                  # gitignored staging file for release-principles.mjs (not read by the site)
├── WhitePaper.md                  # Bitcoin white paper (Markdown transcription)
├── config.php.example             # template for config.php (PHP runtime secrets — gitignored)
├── content/
│   ├── annotations.json           # Beginner Mode term dictionary
│   ├── principles-meta.json       # version/hash/date records, points at the current archive file
│   └── principles-archive/        # frozen snapshot of every published version — what the site actually reads
├── database/
│   └── schema.sql                 # signatures table only — never Principles content
├── public/
│   ├── .htaccess                  # rewrites (preserves /api/*, /endorsements, /admin/* URLs) + security headers
│   ├── whitepaper/*.svg           # white paper diagrams, self-hosted
│   └── php/                       # signature submission + admin moderation — see "How signatures are moderated"
├── scripts/
│   └── release-principles.mjs     # the only way to publish a new version
├── src/
│   ├── components/, layouts/, pages/
│   └── lib/                       # principles.ts, whitepaper.ts, markdown.ts, ...
└── deploy/                        # SiteGround runbook (build happens in CI, not on the server)
```

**Why this stack:** Astro renders the archived Principles snapshot and
WhitePaper.md from disk at build time with minimal JavaScript shipped to
the client (Beginner Mode's toggle and tooltips work via a pure CSS
`:has()` checkbox-hack — no JS required for that feature at all). SQLite is
enough for a signature ledger; there is no reason to reach for a bigger
database for a single low-write-volume table. Static output + PHP (rather
than a Node server) is a hosting-environment constraint, not a preference —
see [`deploy/SITEGROUND_DEPLOY.md`](deploy/SITEGROUND_DEPLOY.md).

## Local development

Requires Node.js 22+ and PHP 8.x.

```bash
npm install
cp .env.example .env          # fill in SITE_URL if it differs from the default
cp config.php.example config.php   # fill in ip_hash_salt, turnstile_* (optional locally)
npm run dev
```

The Astro dev server (`http://localhost:4321`) covers everything except
signature submission and admin moderation. To exercise those too, build
once and serve the combined output with PHP's built-in server:

```bash
npm run build
php -S localhost:8787 -t dist
```

If `content/principles-meta.json` has no `current` version yet (e.g. a fresh
fork with no release history), create a `Principles.md` at the repo root
first (hand-written, or copied from
[blunderbus88/Bitcoin](https://github.com/blunderbus88/Bitcoin)), then run
`npm run release-principles -- --version 1.0` to publish it.

## Environment variables

Two separate places, split by when they're needed:

- **`.env`** (build time only — read by Astro/Vite): see `.env.example`.
  Just `SITE_URL`, the canonical URL used for share links / Open Graph tags.
- **`config.php`** (runtime — read by `public/php/`): see
  `config.php.example`.

  | Key | Purpose |
  |---|---|
  | `database_path` | Path to the SQLite signatures database |
  | `ip_hash_salt` | Salts the hashed IP used only for rate-limiting |
  | `turnstile_site_key` / `turnstile_secret_key` | Cloudflare Turnstile (spam prevention). If unset, verification is **skipped with a warning** — fine for local dev, required in production |
  | `site_url` | Used to validate `Origin`/`Referer` on POST requests (CSRF defense) — should match `.env`'s `SITE_URL` |

Admin credentials are **not** in `config.php` — they're a real Apache Basic
Auth `.htpasswd` file (bcrypt), generated once during deploy setup. See
[`deploy/SITEGROUND_DEPLOY.md`](deploy/SITEGROUND_DEPLOY.md).

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

This is the one part of the site that isn't static Astro output — it's a
small set of PHP scripts under `public/php/` (built into `dist/php/`, and
reached at their original URLs via rewrites in `public/.htaccess`, so
nothing else in the site needed to change). Each function in
`public/php/lib/` is a direct port of what used to be a `src/lib/*.ts`
module before the SiteGround migration (see git history / `deploy/` for
context) — same validation rules, same rate-limit window, same schema.

Submissions (`POST /api/endorse` → `public/php/endorse.php`) are validated
and normalized server-side (`public/php/lib/validation.php`), rate-limited
by a salted IP hash (`public/php/lib/rateLimit.php`), optionally checked
against Cloudflare Turnstile, and inserted with `status = 'pending'`. They
are **never** publicly visible until approved.

`/admin` (real Apache Basic Auth — see
`public/php/admin/.htaccess` and the deploy runbook) lists the pending
queue with Approve/Reject buttons that post to `/api/admin/moderate`.
Approved signatures appear on `/endorsements`.

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
  length-bounded, and normalized in `public/php/lib/validation.php` before
  it ever reaches a SQL parameter (PDO prepared statements only — no
  string-built SQL) or gets echoed back into a page (`h()` in
  `public/php/lib/layout.php` htmlspecialchars-escapes everything by
  default).
- CSRF: `public/php/lib/csrf.php` rejects state-changing POST requests
  whose `Origin`/`Referer` doesn't match `config.php`'s `site_url` (ports
  what Astro's `security.checkOrigin` used to do before this site was
  static).
- `/admin/*` and `/api/admin/*` are gated by real Apache Basic Auth
  (`public/php/admin/.htaccess`, `AuthUserFile` pointing at an `.htpasswd`
  kept outside the web docroot) — requests are rejected before any PHP in
  that directory runs. Security headers (CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set
  in `public/.htaccess` on every response, static or PHP.
- No Google Analytics, no tracking pixels, no third-party scripts except
  Cloudflare Turnstile — and that only loads if `turnstile_site_key` is set.

## Deployment

Production runs on **SiteGround** — Apache + PHP Manager serve the result
directly. There's no Node.js App Manager on this hosting plan, which is why
the dynamic parts of the site are PHP rather than a Node server. The build
itself doesn't run on SiteGround either — this account's memory ceiling is
too low for Astro's (always-WebAssembly) compiler — so **GitHub Actions
builds `dist/` on every push to `main` and pushes it to the server over
SSH** (`.github/workflows/deploy.yml`). See the Architecture section above
and [`deploy/SITEGROUND_DEPLOY.md`](deploy/SITEGROUND_DEPLOY.md) for the
full runbook (one-time setup, the redeploy flow, manual rebuilds).

`npm run build` produces a static `dist/` (Astro's static output, plus
`public/php/` and `public/.htaccess` copied in verbatim, plus a build-time
sync of `src/styles/global.css` to `public/global.css` so the PHP-rendered
pages can share the same stylesheet at a stable path) — this is what
SiteGround's document root points at.

## Terminology note

This project is proceeding on a BLAKE2b proof-of-work chain. Where
necessary, the site distinguishes **BTC-BLAKE2B** from **BTC-SHA256**; the
Principles themselves simply say "Bitcoin" unless a distinction is required.
See the terminology note on the Principles page for the full wording.
