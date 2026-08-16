import type { APIRoute } from 'astro';
import { moderateSignature } from '../../../lib/db';

export const prerender = false;

// Authorization for /api/admin/* is already enforced by src/middleware.ts.

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();

  const idRaw = form.get('id');
  const status = form.get('status');

  const id = typeof idRaw === 'string' ? Number.parseInt(idRaw, 10) : NaN;
  const isValidStatus = status === 'approved' || status === 'rejected';

  if (!Number.isInteger(id) || id <= 0 || !isValidStatus) {
    return new Response('Bad request', { status: 400 });
  }

  moderateSignature(id, status);

  return new Response(null, { status: 303, headers: { Location: '/admin/endorsements' } });
};
