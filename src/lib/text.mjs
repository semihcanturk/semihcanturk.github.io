// Text helpers: HTML escaping, a tiny inline-markdown renderer, small caps.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Collapse YAML line wrapping into single spaces. */
export const squish = (s = '') => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Inline markdown: [text](url), **bold**, *italic*. Everything else is escaped.
 * Link targets are protected so emphasis rules never touch URLs.
 */
export function inline(src = '') {
  const links = [];
  let s = esc(squish(src)).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    links.push(url);
    return `\u0000${links.length - 1}\u0001${text}\u0002`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*]+)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0001([\s\S]*?)\u0002/g, (_, i, text) => `<a href="${links[i]}">${text}</a>`);
  return smallCaps(s);
}

/** Paragraphs separated by blank lines, each rendered with `inline`. */
export function paragraphs(src = '') {
  return String(src ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p)}</p>`)
    .join('\n');
}

/**
 * Wrap all-capital acronyms (ICML, GNN, IEEE, TAG-DS…) in <span class="caps">
 * so they can be set in small caps, as Bringhurst recommends. Only text
 * between tags is touched.
 */
export function smallCaps(html = '') {
  return String(html)
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith('<') ? part : part.replace(
      /\b([A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*)(?=s?\b)/g,
      '<span class="caps">$1</span>',
    )))
    .join('');
}

/** "a, b and c" */
export function listify(items) {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
}

/** URL-safe id from a string. */
export const slug = (s = '') => String(s)
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** True for links that leave the page. */
export const isExternal = (url = '') => /^(https?:)?\/\//.test(url);
