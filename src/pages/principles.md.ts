import type { APIRoute } from 'astro';
import { getCurrentPrinciples } from '../lib/principles';

export const GET: APIRoute = () => {
  const doc = getCurrentPrinciples();
  if (!doc) return new Response('Not found', { status: 404 });

  // inline, not attachment: navigating here views the raw Markdown in the
  // browser ("View Markdown"); the "Download .md" link adds its own
  // `download` attribute to force a save instead. The filename is set here
  // too so a manual Save As (or `curl -OJ`) still lands on the versioned name.
  return new Response(doc.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `inline; filename="${doc.filename}"`,
    },
  });
};
