// HTTP Basic Auth for /admin/*. Deliberately simple — no sessions, no
// password hashing infrastructure, just a timing-safe comparison against
// credentials that only ever come from the environment.

import { timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isAuthorizedAdmin(request: Request): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    console.error('[admin] ADMIN_USER / ADMIN_PASSWORD are not set — admin routes are locked out.');
    return false;
  }

  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice('Basic '.length));
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return safeEqual(user, expectedUser) && safeEqual(password, expectedPassword);
}

export function requireBasicAuthResponse(): Response {
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="bitcoinis.money admin"' },
  });
}
