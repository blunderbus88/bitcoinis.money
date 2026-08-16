import type { APIRoute } from 'astro';
import { getPredictionsMarkdown } from '../lib/predictions';

export const GET: APIRoute = () => {
  return new Response(getPredictionsMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
