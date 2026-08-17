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
`dist/` on every push to `main` and rsyncs it straight into `public_html/`
over SSH** — see `.github/workflows/deploy.yml`. Node/npm/git *are* present
on the server (confirmed via SSH) and were useful for one-time setup, just
not for building.

**The primary domain's document root isn't changeable on this plan** (no
such option anywhere in Site Tools — checked live), so `public_html/` has to
stay the doc root. `dist/` therefore deploys directly into `public_html/`
itself rather than a separate subdirectory. `config.php`, the SQLite
database, and `.htpasswd` all live one level up, in what these docs call the
**app root** (`public_html`'s parent) — outside the web-servable tree, and
untouched by every deploy's `rsync --delete`.

`content/` (specifically `content/principles-meta.json`, which
`public/php/lib/principles.php` reads at request time to re-verify a
submission's version/hash server-side) is source content, not part of
`dist/` — CI syncs it into the app root separately, alongside the
`public_html/` sync.

## One-time setup

### 1. Confirm the website exists in Site Tools

`bitcoinis.money` needs to be added as a Website in Site Tools before the
steps below make sense.

### 2. SSH access

Site Tools → **Devs → SSH Keys Manager**, import a public key. Connection
details (hostname/username/port) are also shown there — they're specific to
this site's own underlying hosting account, which may differ from other
sites under the same billing plan. On this account the app root turned out
to be `~/www/bitcoinis.money` (i.e. `public_html` is
`~/www/bitcoinis.money/public_html`) — confirm the equivalent for whatever
account you're setting this up on.

### 3. Devs → PHP Manager

Confirm PHP 8.x is selected for this site, and that the `pdo_sqlite`
extension is enabled (confirmed available by default on this account: PHP
8.2.33 with `pdo_sqlite`, `sqlite3`, and `curl`).

### 4. Clone the repo (optional — reference copy only, not what's served)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_deploy -N "" -C "bitcoinis.money-deploy"
# Add ~/.ssh/id_ed25519_deploy.pub as a read-only Deploy Key on the GitHub
# repo (Settings → Deploy keys). Requires repo admin permission.

GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_deploy -o IdentitiesOnly=yes" \
  git clone git@github.com:blunderbus88/bitcoinis.money.git ~/www/bitcoinis.money/repo
cd ~/www/bitcoinis.money/repo
git config core.sshCommand "ssh -i ~/.ssh/id_ed25519_deploy -o IdentitiesOnly=yes"
```

Nothing on the server reads from this checkout — it's just a convenient copy
of `config.php.example` / `database/schema.sql` to reference over SSH.
Everything actually served comes from CI's rsync into `public_html/`.

### 5. Create the runtime config and admin credentials (over SSH, in the app root)

```bash
cd ~/www/bitcoinis.money   # app root — one level above public_html
cp repo/config.php.example config.php
mkdir -p database
# ip_hash_salt: openssl rand -hex 32
# turnstile_secret_key: from Cloudflare Turnstile (optional — blank skips
#   verification and logs a warning; fine for initial setup, not for prod)
# site_url: https://bitcoinis.money
$EDITOR config.php

# Admin credentials — real Apache Basic Auth, not app-level config.
# Generate a bcrypt hash without ever putting the password in argv/history:
printf '%s' 'your-password' | php -r '$p = trim(stream_get_contents(STDIN), "\n"); echo password_hash($p, PASSWORD_BCRYPT);'
# Then write "username:<hash>" into .htpasswd by hand, in the app root.
```

`config.php` and `.htpasswd` live in the app root — **outside**
`public_html/` — so they're never web-reachable regardless of `.htaccess`,
and are never touched by a deploy (CI only rsyncs into `public_html/`).
`public/php/lib/db.php` creates `database/signatures.db` there on first
request and applies `database/schema.sql` idempotently — no separate
DB-init step.

### 6. Wire up CI deploy secrets on GitHub

Generate a **separate** keypair (write access, distinct from the read-only
clone key from step 4) and add its public half to this account's
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
| `SITEGROUND_APP_ROOT` | absolute path, e.g. `/home/xxxxx/www/bitcoinis.money` (public_html's parent, **not** public_html itself) |

Optionally set the `TURNSTILE_SITE_KEY` **repository variable** (Settings →
Secrets and variables → Actions → Variables) — it's the public site key, not
a secret, embedded at build time in the static `/endorse` page.

Discard the local copy of the private key once it's stored as a GitHub
secret.

### 7. Run the first deploy

Push to `main` (or trigger `.github/workflows/deploy.yml` manually via
"Run workflow" in the Actions tab). It builds `dist/` in CI and rsyncs it
into `$SITEGROUND_APP_ROOT/public_html/`.

## Redeploying

Every push to `main` — including the automated `sync-principles.yml` /
`sync-predictions.yml` commits — triggers `.github/workflows/deploy.yml`,
which rebuilds `dist/` and rsyncs it over. Apache/PHP-FPM serve the new
files on the very next request — nothing to restart.

## Manual rebuild / redeploy

Actions tab → **Deploy to SiteGround** → **Run workflow**.

## Verifying a deploy

Before DNS points at SiteGround, verify with a Host-header override against
the server directly (works over both HTTP and HTTPS via SNI):

```bash
SERVER_IP=$(dig +short <ssh-hostname> | head -1)
curl -skI -H "Host: bitcoinis.money" "https://$SERVER_IP/"
curl -sk -o /dev/null -w '%{http_code}\n' -H "Host: bitcoinis.money" \
  "https://$SERVER_IP/admin/endorsements"   # expect 401 with no credentials
```

Once DNS points here, the same checks work directly:

```bash
curl -I https://bitcoinis.money/
curl -I https://bitcoinis.money/admin/endorsements   # expect 401 with no credentials
```

Then in a browser: load `/principles` and `/whitepaper`, submit a test
signature via `/endorse`, confirm it lands in `/admin/endorsements` (HTTP
Basic Auth, credentials from step 5) as pending, approve it, confirm it
appears on `/endorsements`.
