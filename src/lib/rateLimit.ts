// Privacy-conscious rate limiting: we never store raw IP addresses, only a
// salted SHA-256 hash, used solely to throttle abusive submission bursts.

import { createHash } from 'node:crypto';
import { countRecentSubmissions } from './db';

const WINDOW_MINUTES = 60;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? '';
  if (!salt) {
    console.warn('[rateLimit] IP_HASH_SALT is not set — using an unsalted hash. Set it in production.');
  }
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export function getClientIp(request: Request): string {
  // Behind a reverse proxy, X-Forwarded-For's first entry is the original client.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export function isRateLimited(ipHash: string): boolean {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  return countRecentSubmissions(ipHash, since) >= MAX_SUBMISSIONS_PER_WINDOW;
}
