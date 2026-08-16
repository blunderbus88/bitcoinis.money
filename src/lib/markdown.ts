// Renders trusted, repo-controlled Markdown (Principles.md, the White Paper)
// to HTML, and optionally layers Beginner Mode term annotations on top.
//
// Important: annotation happens on the *rendered token stream*, never by
// editing the source Markdown. Principles.md is never touched by this file.

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false, // never trust/render raw HTML from source files
  linkify: true,
  typographer: true,
});

export function renderMarkdown(source: string): string {
  return md.render(source);
}

/**
 * Strips the Markdown syntax used in Principles.md (ATX headers, emphasis,
 * links) so the source reads as plain prose — e.g. for prefilling a tweet
 * with the document's actual text rather than its markup.
 */
export function markdownToPlainText(source: string): string {
  return source
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type AnnotationDictionary = Record<string, string>;

/**
 * Renders Markdown with Beginner Mode term annotations layered in.
 *
 * Matching terms in body text are wrapped in
 *   <span class="term" data-term="…" tabindex="0">text</span>
 * CSS handles the dotted underline and hover/focus tooltip — see
 * src/styles/global.css. No JS is required for the tooltip itself.
 */
export function renderMarkdownWithAnnotations(source: string, annotations: AnnotationDictionary): string {
  const terms = Object.keys(annotations)
    .filter((k) => k !== '_readme' && k.trim().length > 0)
    .sort((a, b) => b.length - a.length); // longest phrase first

  if (terms.length === 0) {
    return renderMarkdown(source);
  }

  const instance = new MarkdownIt({ html: false, linkify: true, typographer: true });
  instance.core.ruler.push('annotate_terms', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue;
      blockToken.children = annotateChildren(blockToken.children, terms, annotations);
    }
  });

  return instance.render(source);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function buildMatcher(terms: string[]): RegExp {
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

// markdown-it's renderer dispatches purely on `token.type` for 'text' and
// 'html_inline' (the default rules only read `.content`), so plain objects
// are sufficient here — no need to touch markdown-it's internal Token class.
function textToken(content: string) {
  return { type: 'text', content };
}

function htmlInlineToken(content: string) {
  return { type: 'html_inline', content };
}

function annotateChildren(children: any[], terms: string[], annotations: AnnotationDictionary): any[] {
  const matcher = buildMatcher(terms);
  const result: any[] = [];

  for (const token of children) {
    // Only split plain text tokens. Leave code, links, existing HTML, etc. alone.
    if (token.type !== 'text' || !token.content) {
      result.push(token);
      continue;
    }

    const text = token.content;
    matcher.lastIndex = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let matchedAny = false;

    while ((match = matcher.exec(text)) !== null) {
      matchedAny = true;
      const [full] = match;
      const start = match.index;

      if (start > lastIndex) {
        result.push(textToken(text.slice(lastIndex, start)));
      }

      const canonicalKey = terms.find((t) => t.toLowerCase() === full.toLowerCase()) ?? full;
      const definition = annotations[canonicalKey] ?? '';

      result.push(
        htmlInlineToken(
          `<span class="term" data-term="${escapeAttr(canonicalKey)}" data-definition="${escapeAttr(
            definition
          )}" tabindex="0">`
        )
      );
      result.push(textToken(full));
      result.push(htmlInlineToken('</span>'));

      lastIndex = start + full.length;
    }

    if (!matchedAny) {
      result.push(token);
      continue;
    }

    if (lastIndex < text.length) {
      result.push(textToken(text.slice(lastIndex)));
    }
  }

  return result;
}
