import { esc, inline, smallCaps, slug } from '../lib/text.mjs';
import { year, isoDate } from '../lib/dates.mjs';
import { section, entry, list } from './_parts.mjs';

function authors(list, myName) {
  const me = slug(myName);
  return list.map((raw) => {
    const equal = /\*\s*$/.test(raw);
    const name = String(raw).replace(/\*+\s*$/, '').trim();
    const star = equal ? '<sup class="eq" title="Equal contribution">*</sup>' : '';
    return slug(name) === me
      ? `<span class="me">${esc(name)}</span>${star}`
      : `${esc(name)}${star}`;
  }).join(', ');
}

function paper(p, myName, repeatYear) {
  const links = Object.entries(p.links ?? {})
    .map(([label, url]) => `<a href="${esc(url)}">${esc(label)}</a>`);
  if (p.bibtex) {
    links.push(`<button type="button" class="linkish" data-bib-toggle aria-expanded="false" aria-controls="bib-${esc(p.id)}" hidden>BibTeX</button>`);
  }
  const venue = [
    `<span class="paper__venue-name">${smallCaps(esc(p.venue))}</span>`,
    year(p.date),
    p.award && `<strong class="award">${esc(p.award)}</strong>`,
    p.note && `<span class="paper__note">${esc(p.note)}</span>`,
  ].filter(Boolean).join(', ');

  const titleLink = p.links?.PDF ?? p.links?.arXiv ?? Object.values(p.links ?? {})[0];
  const title = titleLink ? `<a href="${esc(titleLink)}">${esc(p.title)}</a>` : esc(p.title);

  return entry({
    id: p.id,
    when: String(year(p.date)),
    datetime: isoDate(p.date),
    repeat: repeatYear,
    className: `paper${p.featured ? ' paper--featured' : ''}${p.featured && p.summary ? ' paper--glossed' : ''}`,
    // On wide screens the summary of a featured paper sits in its own column
    // beside the authors and venue, rather than below them.
    body: `
      <h3 class="paper__title">${title}</h3>
      <div class="paper__meta">
        <p class="paper__authors">${authors(p.authors, myName)}</p>
        <p class="paper__venue">${venue}</p>
        ${links.length ? `<p class="paper__links">${links.join(' ')}</p>` : ''}
      </div>
      ${p.featured && p.summary ? `<p class="paper__summary">${inline(p.summary)}</p>` : ''}
      ${p.bibtex ? `<div class="bib" id="bib-${esc(p.id)}" hidden><pre>${esc(String(p.bibtex).trim())}</pre><button type="button" class="linkish" data-copy>Copy</button></div>` : ''}`,
  });
}

export function papers({ publications, profile }) {
  const anyEqual = publications.some((p) => p.authors.some((a) => /\*\s*$/.test(a)));
  const rows = publications.map((p, i) => paper(p, profile.name, i > 0 && year(publications[i - 1].date) === year(p.date)));
  return section({
    id: 'papers',
    title: 'Papers',
    note: anyEqual ? '<sup class="eq">*</sup> equal contribution' : '',
    className: 'papers',
    body: list(rows, 'entries--papers'),
  });
}
