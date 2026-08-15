import type { APIRoute } from 'astro';
import { getCurrentPrinciples } from '../../lib/principles';
import {
  validateName,
  validateParticipantType,
  validateUrl,
  validateGithub,
  validateXProfile,
  validateNostr,
  validateComment,
  validateVersion,
  validateHash,
} from '../../lib/validation';
import { verifyTurnstile } from '../../lib/turnstile';
import { getClientIp, hashIp, isRateLimited } from '../../lib/rateLimit';
import { insertSignature } from '../../lib/db';

export const prerender = false;

function redirectTo(url: URL, path: string, params: Record<string, string> = {}): Response {
  const dest = new URL(path, url.origin);
  for (const [key, value] of Object.entries(params)) dest.searchParams.set(key, value);
  return new Response(null, { status: 303, headers: { Location: dest.pathname + dest.search } });
}

export const POST: APIRoute = async ({ request, url }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirectTo(url, '/sign', { error: 'validation' });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  if (isRateLimited(ipHash)) {
    return redirectTo(url, '/sign', { error: 'rate_limited' });
  }

  const name = validateName(form.get('name'));
  const participantType = validateParticipantType(form.get('participant_type'));
  const website = validateUrl(form.get('website'));
  const github = validateGithub(form.get('github'));
  const xProfile = validateXProfile(form.get('x_profile'));
  const nostr = validateNostr(form.get('nostr'));
  const comment = validateComment(form.get('comment'));
  const submittedVersion = validateVersion(form.get('principles_version'));
  const submittedHash = validateHash(form.get('principles_hash'));

  if (!name || !participantType || !submittedVersion || !submittedHash) {
    return redirectTo(url, '/sign', { error: 'validation' });
  }

  // The signature must be bound to the currently published version. If the
  // Principles were re-released between page load and submission, reject
  // rather than silently signing the wrong (or a stale) version.
  const current = getCurrentPrinciples();
  if (!current || submittedVersion !== current.version || submittedHash !== current.hash) {
    return redirectTo(url, '/sign', { error: 'version' });
  }

  const turnstileToken = form.get('cf-turnstile-response');
  const verified = await verifyTurnstile(typeof turnstileToken === 'string' ? turnstileToken : null, ip);
  if (!verified) {
    return redirectTo(url, '/sign', { error: 'challenge' });
  }

  insertSignature({
    name,
    participantType,
    website,
    github,
    xProfile,
    nostr,
    comment,
    principlesVersion: submittedVersion,
    principlesHash: submittedHash,
    ipHash,
  });

  return redirectTo(url, '/sign', { submitted: '1' });
};
