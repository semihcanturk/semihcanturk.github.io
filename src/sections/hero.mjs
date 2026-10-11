// The opening: masthead, name, position, links, and Fig. 1 (the
// collaboration graph, with my portrait at its centre).

import { esc, inline } from '../lib/text.mjs';
import { markedName } from './_parts.mjs';

const DEFAULT_CAPTION = 'My collaboration graph: {papers} papers (squares) and {people} co-authors (circles).';

// The color-scheme button: a node drawn hollow (light), half-filled (auto)
// or filled (dark). Hidden until site.js wires it up.
const SCHEME_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle class="scheme-toggle__disc" cx="8" cy="8" r="6"/><path class="scheme-toggle__half" d="M8 2a6 6 0 0 1 0 12z"/><circle class="scheme-toggle__ring" cx="8" cy="8" r="6"/></svg>`;

export function masthead({ site, profile }) {
  const nav = (site.nav ?? []).map((n) => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join('');
  const scheme = ['light', 'dark'].includes(site.theme?.color_scheme) ? site.theme.color_scheme : 'auto';
  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="masthead">
  <a class="masthead__name" href="#top">${esc(profile.name)}</a>
  <div class="masthead__end">
    <nav class="masthead__nav" aria-label="Sections"><ul role="list">${nav}</ul></nav>
    <button type="button" class="scheme-toggle" data-scheme-toggle data-default="${scheme}" aria-label="Color scheme" hidden>${SCHEME_ICON}</button>
  </div>
</header>`;
}

export function hero({ site, profile, graph }) {
  const [given, ...rest] = profile.name.split(' ');
  const family = rest.join(' ');
  const quick = [
    profile.email && `<li><a href="mailto:${esc(profile.email)}">Email</a></li>`,
    profile.cv && `<li><a href="${esc(profile.cv)}">CV <span class="hint">(PDF)</span></a></li>`,
    ...(profile.links ?? []).map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`),
  ].filter(Boolean).join('');
  const caption = inline(site.graph?.caption ?? DEFAULT_CAPTION)
    .replaceAll('{papers}', graph.stats.papers)
    .replaceAll('{people}', graph.stats.people);

  return `
<section class="hero" id="top" aria-label="Introduction">
  <div class="hero__text">
    <h1 class="hero__name">
      <span class="hero__given">${esc(given)}</span>
      <span class="hero__family">${markedName(family)}</span>
    </h1>
    ${profile.position ? `<p class="hero__position">${inline(profile.position)}</p>` : ''}
    <ul class="hero__links" role="list">${quick}</ul>
  </div>
  <figure class="hero__figure">
    <div class="graph" data-graph style="aspect-ratio:${graph.width} / ${graph.height}">
      ${graph.svg}
      <div class="graph__labels" aria-hidden="true">${graph.labels}</div>
      <div class="graph__tip" hidden></div>
    </div>
    <figcaption class="hero__caption" id="fig-1">
      <span class="fig">Fig. 1.</span> ${caption}
      <span class="hero__caption-hint">Point at a node to see who or what it is.</span>
    </figcaption>
  </figure>
</section>`;
}
