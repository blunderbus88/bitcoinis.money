# Deploying to SiteGround

Production runs on SiteGround via Site Tools' **Node.js App Manager**
(Phusion Passenger) and **Git** tool — no Docker, no systemd, no root/sudo.
This account is a Site Tools–managed environment: no compiler toolchain
(`better-sqlite3` installs from a prebuilt binary instead, no build step
needed), no working `systemctl`, no `crontab` on PATH. Everything below
works within those constraints.

## One-time setup

### 1. Confirm the website exists in Site Tools

`bitcoinis.money` needs to be added as a Website in Site Tools (Websites →
New Website, or a parked domain) before the steps below make sense.

### 2. Devs → Git

- Repository: `git@github.com:blunderbus88/bitcoinis.money.git`
- Target directory: `~/www/bitcoinismoney-app`
- Branch: `main`
- Add the deploy key Site Tools generates to the GitHub repo's
  **Settings → Deploy keys** (read-only is sufficient).
- Run the first pull from here.

### 3. Install the post-merge hook (once, over SSH, after step 2's first pull)

```bash
cd ~/www/bitcoinismoney-app
ln -sf ../../deploy/hooks/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge deploy/hooks/post-merge
```

Site Tools' Git tool does a plain `git pull` into this working copy, so this
standard git hook fires on every future pull — it runs `npm ci`,
`npm run build`, then touches `tmp/restart.txt` (Passenger's restart
convention) so the app manager picks up the new build.

Run it once by hand to confirm a clean build before relying on automation:

```bash
cd ~/www/bitcoinismoney-app && ./deploy/hooks/post-merge
```

### 4. Devs → Node.js App Manager → Create App

- Application root: `~/www/bitcoinismoney-app`
- Application URL: `bitcoinis.money`
- Application startup file: `dist/server/entry.mjs`
- Node version: 22.x
- Environment variables (set here — **never** committed to the repo; see
  `.env.example` for the full list and description of each):
  - `SITE_URL=https://bitcoinis.money`
  - `DATABASE_PATH=./database/signatures.db`
  - `ADMIN_USER`, `ADMIN_PASSWORD`
  - `IP_HASH_SALT`
  - `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
  - `NODE_ENV=production`
  - Leave `PORT` / `HOST` unset — Passenger supplies `PORT` itself, and
    `@astrojs/node`'s standalone server already reads `process.env.PORT` /
    `process.env.HOST` at runtime.
- Start the app.

The SQLite database file lives at `database/signatures.db` under the app
root and is gitignored (`database/*.db*`), so `git pull` never touches it —
signature data survives every redeploy. `src/lib/db.ts` applies
`database/schema.sql` idempotently on first query, so there's no separate
DB-init step.

## Redeploying

Once the above is set up, this is the whole flow:

1. Push to `main` on GitHub (directly, or via the automated
   `sync-principles.yml` / `sync-predictions.yml` workflows, which already
   push commits there on their own schedule).
2. Site Tools' Git tool pulls the new commit (automatically, if its
   auto-deploy webhook is enabled — otherwise click "Deploy" in Site Tools).
3. The `post-merge` hook rebuilds and touches `tmp/restart.txt`.
4. Passenger restarts the app on the next request.

## Manual rebuild / restart

If a deploy needs to be re-run by hand (e.g. `npm ci` failed, or a hook
didn't fire):

```bash
cd ~/www/bitcoinismoney-app
./deploy/hooks/post-merge
```

Or restart without rebuilding: `touch tmp/restart.txt`, or use the "Restart
App" button in Site Tools' Node.js App Manager.

## Verifying a deploy

```bash
curl -I https://bitcoinis.money/
```

Then in a browser: load `/principles` and `/whitepaper`, submit a test
signature via `/endorse`, confirm it lands in `/admin/endorsements` (HTTP
Basic Auth) as pending, approve it, confirm it appears on `/signatures`.
