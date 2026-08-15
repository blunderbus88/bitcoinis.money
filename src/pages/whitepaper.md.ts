import type { APIRoute } from 'astro';
import { getWhitePaperMarkdown } from '../lib/whitepaper';

export const GET: APIRoute = () => {
  return new Response(getWhitePaperMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
