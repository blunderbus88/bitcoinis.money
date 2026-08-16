export function tweetIntent(text: string, url?: string): string {
  const base = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return url ? `${base}&url=${encodeURIComponent(url)}` : base;
}
