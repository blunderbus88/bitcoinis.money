// Cloudflare Turnstile verification. If keys aren't configured, verification
// is skipped in development with a loud warning — production deployments
// must set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY || null;
}

export async function verifyTurnstile(token: string | null, remoteIp: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — skipping verification (development only).');
    return true;
  }

  if (!token) return false;

  const body = new URLSearchParams({ secret: secretKey, response: token, remoteip: remoteIp });

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verification request failed:', err);
    return false;
  }
}
