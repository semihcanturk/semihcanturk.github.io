// Building blocks shared by the section templates.

import { esc } from '../lib/text.mjs';

/**
 * A page section: a heading in the left margin (sticky on wide screens)
 * and the content to its right.
 */
export function section({ id, title, note = '', body, className = '' }) {
  return `
<section class="section ${className}" id="${id}" aria-labelledby="${id}-title">
  <header class="section__head">
    <h2 class="section__title" id="${id}-title">${title}</h2>
    ${note ? `<p class="section__note">${note}</p>` : ''}
  </header>
  <div class="section__body">
${body}
  </div>
</section>`;
}

/**
 * One row of a dated list: the date hangs in its own column, the content
 * runs beside it. `repeat` hides a date identical to the row above
 * (still read aloud by screen readers).
 */
export function entry({ when = '', datetime = '', body, className = '', id = '', repeat = false }) {
  const time = when
    ? `<time class="entry__when${repeat ? ' is-repeat' : ''}"${datetime ? ` datetime="${datetime}"` : ''}>${esc(when)}</time>`
    : '<span class="entry__when"></span>';
  return `<li class="entry ${className}"${id ? ` id="${esc(id)}"` : ''}>${time}<div class="entry__body">${body}</div></li>`;
}

export const list = (items, className = '') => `<ol class="entries ${className}" role="list">${items.join('\n')}</ol>`;

/** The ü in the name, drawn as a two-node graph (saffron nodes, ink edge). */
export const umlautMark = `<svg class="umlaut__mark" viewBox="0 0 40 10" aria-hidden="true" focusable="false"><line x1="5" y1="5" x2="35" y2="5"/><circle cx="5" cy="5" r="4.2"/><circle cx="35" cy="5" r="4.2"/></svg>`;

/** Render a name, replacing ü with the drawn mark. Readers get the real name. */
export function markedName(name, className = '') {
  const i = name.indexOf('ü');
  if (i === -1) return esc(name);
  return `<span class="${className}" aria-hidden="true">${esc(name.slice(0, i))}<span class="umlaut">u${umlautMark}</span>${esc(name.slice(i + 1))}</span><span class="visually-hidden">${esc(name)}</span>`;
}
