import { defineMiddleware } from 'astro:middleware';
import { isAuthorizedAdmin, requireBasicAuthResponse } from './lib/adminAuth';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Scripts: 'self' plus Turnstile's frame/script when configured. No inline
  // scripts, no third-party analytics.
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' https://challenges.cloudflare.com; " +
    "frame-src https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self'; " +
    "base-uri 'none'; " +
    "form-action 'self'",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!isAuthorizedAdmin(context.request)) {
      return requireBasicAuthResponse();
    }
  }

  const response = await next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
});
