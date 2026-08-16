# Deploying to SiteGround

Production runs on SiteGround via Site Tools' **Git** tool, plain Apache +
PHP (via PHP Manager), and a static build from Astro — **no Node.js App
Manager**: this account's plan doesn't offer Node hosting at all (checked
live, on more than one site under the account). The site is architected
around that constraint: `astro build` produces plain static HTML/CSS/JS,
and the handful of genuinely dynamic pieces (signature submission + admin
moderation) are plain PHP scripts under `public/php/` (built into
`dist/php/`). No compiler toolchain either — not needed here, since nothing
in this stack requires a native build step.

## One-time setup

### 1. Confirm the website exists in Site Tools

`bitcoinis.money` needs to be added as a Website in Site Tools before the
steps below make sense.

### 2. Devs → Git

- Repository: `git@github.com:blunderbus88/bitcoinis.money.git`
- Target directory: `~/www/bitcoinismoney-app` (adjust the paths below if
  you pick a different name)
- Branch: `main`
- Add the deploy key Site Tools generates to the GitHub repo's
  **Settings → Deploy keys** (read-only is sufficient).
- Run the first pull from here.

### 3. Devs → PHP Manager

Confirm PHP 8.x is selected for this site, and that the `pdo_sqlite`
extension is enabled (it's on by default on SiteGround, but check). If it's
genuinely unavailable, `public/php/lib/db.php` would need a MySQL swap —
see the note in the project's plan history; not expected to be necessary.

### 4. Document root

**Domain → Document root** → `~/www/bitcoinismoney-app/dist`. `dist/` is
git-ignored and only exists after a build (step 6) — the site will 404 or
show a directory listing until then, which is expected on a first setup.

### 5. Create the runtime config and credentials (over SSH)

```bash
cd ~/www/bitcoinismoney-app
cp config.php.example config.php
$EDITOR config.php   # fill in ip_hash_salt, turnstile_*, site_url

# Admin credentials — real Apache Basic Auth, not app-level config. -B bcrypts.
htpasswd -c -B .htpasswd your-admin-username
```

(`htpasswd` ships with Apache on SiteGround; if it's ever missing, generate
a bcrypt hash with `php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT), PHP_EOL;"`
and write `username:$2y$...` into `.htpasswd` by hand.)

Both `config.php` and `.htpasswd` live at the repo root — **outside**
`dist/` (the web docroot) — so they're never web-reachable regardless of
`.htaccess`, the same property the old env-var-based secrets had.

### 6. Install the post-merge hook and run the first build

```bash
cd ~/www/bitcoinismoney-app
ln -sf ../../deploy/hooks/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge deploy/hooks/post-merge
./deploy/hooks/post-merge
```

This runs `npm ci && npm run build`, then patches the `{{REPO_ROOT}}`
placeholder in `dist/php/admin/.htaccess` (Apache's `AuthUserFile` needs an
absolute path, and it's regenerated fresh on every deploy since `dist/` is
rebuilt from scratch each time). From here on, Site Tools' Git tool pulling
new commits fires this same hook automatically (it's a standard git
`post-merge` hook).

The SQLite database file lives at `database/signatures.db` under the repo
root (outside `dist/`, gitignored), so `git pull` never touches it —
signature data survives every redeploy. `public/php/lib/db.php` applies
`database/schema.sql` idempotently on first query, so there's no separate
DB-init step.

## Redeploying

1. Push to `main` on GitHub (directly, or via the automated
   `sync-principles.yml` / `sync-predictions.yml` workflows, which already
   push commits there on their own schedule).
2. Site Tools' Git tool pulls the new commit (automatically if its
   auto-deploy webhook is enabled, otherwise click "Deploy").
3. The `post-merge` hook rebuilds `dist/` and re-patches the admin
   `.htaccess`. Apache/PHP-FPM serve the new files on the very next
   request — nothing to restart.

## Manual rebuild

```bash
cd ~/www/bitcoinismoney-app && ./deploy/hooks/post-merge
```

## Verifying a deploy

```bash
curl -I https://bitcoinis.money/
curl -I https://bitcoinis.money/admin/endorsements   # expect 401 with no credentials
```

Then in a browser: load `/principles` and `/whitepaper`, submit a test
signature via `/endorse`, confirm it lands in `/admin/endorsements` (HTTP
Basic Auth, credentials from step 5) as pending, approve it, confirm it
appears on `/endorsements`.
