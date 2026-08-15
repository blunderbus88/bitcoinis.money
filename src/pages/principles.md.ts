import type { APIRoute } from 'astro';
import { getCurrentPrinciples } from '../lib/principles';

export const GET: APIRoute = () => {
  const doc = getCurrentPrinciples();
  if (!doc) return new Response('Not found', { status: 404 });

  // No Content-Disposition: navigating here views the raw Markdown inline
  // ("View Markdown"); the "Download .md" link adds its own `download`
  // attribute to force a save instead.
  return new Response(doc.markdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
