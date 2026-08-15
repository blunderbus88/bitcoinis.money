import type { APIRoute } from 'astro';
import { getCurrentPrinciples } from '../lib/principles';

export const GET: APIRoute = () => {
  const { markdown } = getCurrentPrinciples();
  // No Content-Disposition: navigating here views the raw Markdown inline
  // ("View Markdown"); the "Download .md" link adds its own `download`
  // attribute to force a save instead.
  return new Response(markdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
