import type { APIRoute } from 'astro';
import { getPrinciplesVersion } from '../../lib/principles';
import { validateVersion } from '../../lib/validation';

export const GET: APIRoute = ({ params }) => {
  const version = validateVersion(params.version);
  if (!version) return new Response('Not found', { status: 404 });

  const doc = getPrinciplesVersion(version);
  if (!doc) return new Response('Not found', { status: 404 });

  return new Response(doc.markdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
