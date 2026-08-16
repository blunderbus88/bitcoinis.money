# Deploying to SiteGround

Production runs on SiteGround via plain Apache + PHP (via PHP Manager) and a
static build from Astro — **no Node.js App Manager**: this account's plan
doesn't offer Node hosting at all (checked live, on more than one site under
the account). `astro build` produces plain static HTML/CSS/JS, and the
handful of genuinely dynamic pieces (signature submission + admin
moderation) are plain PHP scripts under `public/php/` (built into
`dist/php/`).

**The build does not run on the server.** This account's memory ceiling is
too low for Astro's compiler — it's always WebAssembly-based (not just a
fallback), and both `astro check` and `astro build` fail there with a WASM
out-of-memory error (confirmed live; `/proc/meminfo` isn't even readable in
this environment, so it's a tightly capped sandbox rather than a real VPS
despite the "Cloud Hosting" branding). Instead, **GitHub Actions builds
`dist/` on every push to `main` and pushes it straight to the server over
SSH** — see `.github/workflows/deploy.yml`. Node/npm/git *are* present on
the server (confirmed via SSH) and were used for the one-time setup below,
just not for building.

## One-time setup

### 1. Confirm the website exists in Site Tools

`bitcoinis.money` needs to be added as a Website in Site Tools before the
steps below make sense. Note: this account's plan doesn't include the Git
tool under **Devs**, so repo sync happens over plain SSH/rsync instead (see
below), not Site Tools' Git integration.

### 2. SSH access

Site Tools → **Devs → SSH Keys Manager**, import a public key. Connection
details (hostname/username/port) are also shown there — they're specific to
this site's own underlying hosting account, which may differ from other
sites under the same billing plan.

### 3. Clone the repo (one-time, holds config/database — not rebuilt by deploys)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_deploy -N "" -C "bitcoinis.money-deploy"
# Add ~/.ssh/id_ed25519_deploy.pub as a read-only Deploy Key on the GitHub
# repo (Settings → Deploy keys). Requires repo admin permission.

git config --global core.sshCommand "ssh -i ~/.ssh/id_ed25519_deploy -o IdentitiesOnly=yes" # or set per-repo after cloning
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_deploy -o IdentitiesOnly=yes" \
  git clone git@github.com:blunderbus88/bitcoinis.money.git ~/www/bitcoinis.money/repo
cd ~/www/bitcoinis.money/repo
git config core.sshCommand "ssh -i ~/.ssh/id_ed25519_deploy -o IdentitiesOnly=yes"
```

`dist/` under this checkout is what deploys write into (via rsync from CI —
see step 6); the rest of the checkout (`config.php`, `database/`, source)
is not touched by `git pull` on any regular schedule, since deploys no
longer go through git on the server side at all.

### 4. Devs → PHP Manager

Confirm PHP 8.x is selected for this site, and that the `pdo_sqlite`
extension is enabled (confirmed available by default on this account: PHP
8.2.33 with `pdo_sqlite`, `sqlite3`, and `curl`).

### 5. Document root

**Domain → Document root** → `~/www/bitcoinis.money/repo/dist`. `dist/` is
git-ignored and only exists after the first CI deploy (step 7) — the site
will 404 or show a directory listing until then, which is expected on a
first setup.

### 6. Create the runtime config and admin credentials (over SSH)

```bash
cd ~/www/bitcoinis.money/repo
cp config.php.example config.php
# ip_hash_salt: openssl rand -hex 32
# turnstile_secret_key: from Cloudflare Turnstile (optional — blank skips
#   verification and logs a warning; fine for initial setup, not for prod)
# site_url: https://bitcoinis.money
$EDITOR config.php

# Admin credentials — real Apache Basic Auth, not app-level config.
# Generate a bcrypt hash without ever putting the password in argv/history:
printf '%s' 'your-password' | php -r '$p = trim(stream_get_contents(STDIN), "\n"); echo password_hash($p, PASSWORD_BCRYPT);'
# Then write "username:<hash>" into .htpasswd by hand.
```

Both `config.php` and `.htpasswd` live at the repo root — **outside**
`dist/` (the web docroot) — so they're never web-reachable regardless of
`.htaccess`, and are never touched by a deploy (CI only rsyncs into
`dist/`).

### 7. Wire up CI deploy secrets on GitHub

Generate a **separate** keypair (write access, distinct from the read-only
clone key from step 3) and add its public half to this account's
`~/.ssh/authorized_keys`:

```bash
ssh-keygen -t ed25519 -f ci_deploy_key -N "" -C "github-actions-ci-deploy"
# Append ci_deploy_key.pub to ~/.ssh/authorized_keys on the server (via SSH).
```

Then set these as GitHub Actions repo secrets (Settings → Secrets and
variables → Actions):

| Secret | Value |
|---|---|
| `SITEGROUND_SSH_KEY` | contents of `ci_deploy_key` (private half) |
| `SITEGROUND_HOST` | this site's SSH hostname |
| `SITEGROUND_PORT` | this site's SSH port |
| `SITEGROUND_USER` | this site's SSH username |
| `SITEGROUND_REPO_PATH` | absolute path, e.g. `/home/xxxxx/www/bitcoinis.money/repo` |

Optionally set the `TURNSTILE_SITE_KEY` **repository variable** (Settings →
Secrets and variables → Actions → Variables) — it's the public site key, not
a secret, embedded at build time in the static `/endorse` page.

Discard the local copy of the private key once it's stored as a GitHub
secret.

### 8. Run the first deploy

Push to `main` (or trigger `.github/workflows/deploy.yml` manually via
"Run workflow" in the Actions tab). It builds `dist/` in CI and rsyncs it to
`REPO_PATH/dist/` on the server.

## Redeploying

Every push to `main` — including the automated `sync-principles.yml` /
`sync-predictions.yml` commits — triggers `.github/workflows/deploy.yml`,
which rebuilds `dist/` and rsyncs it over. Apache/PHP-FPM serve the new
files on the very next request — nothing to restart.

## Manual rebuild / redeploy

Actions tab → **Deploy to SiteGround** → **Run workflow**.

## Verifying a deploy

```bash
curl -I https://bitcoinis.money/
curl -I https://bitcoinis.money/admin/endorsements   # expect 401 with no credentials
```

Then in a browser: load `/principles` and `/whitepaper`, submit a test
signature via `/endorse`, confirm it lands in `/admin/endorsements` (HTTP
Basic Auth, credentials from step 6) as pending, approve it, confirm it
appears on `/endorsements`.
