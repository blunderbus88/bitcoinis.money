// The Cloudflare Turnstile *site key* only — public by design, safe to
// embed in the static /endorse page at build time. Verification (which
// needs the secret key) happens server-side in public/php/lib/turnstile.php
// instead, since this site has no per-request server to do it in Astro.

export function turnstileSiteKey(): string | null {
  return import.meta.env.TURNSTILE_SITE_KEY || null;
}
