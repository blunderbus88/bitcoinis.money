import type { APIRoute, GetStaticPaths } from 'astro';
import { getPrinciplesVersion, listVersions } from '../../lib/principles';
import { validateVersion } from '../../lib/validation';

// Static output needs every version's path known at build time — there's
// no per-request server left to resolve arbitrary :version values.
export const getStaticPaths: GetStaticPaths = () =>
  listVersions().map((v) => ({ params: { version: v.version } }));

export const GET: APIRoute = ({ params }) => {
  const version = validateVersion(params.version);
  if (!version) return new Response('Not found', { status: 404 });

  const doc = getPrinciplesVersion(version);
  if (!doc) return new Response('Not found', { status: 404 });

  return new Response(doc.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `inline; filename="${doc.filename}"`,
    },
  });
};
