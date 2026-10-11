import { esc, inline } from '../lib/text.mjs';
import { range } from '../lib/dates.mjs';
import { section, entry, list } from './_parts.mjs';

const linked = (text, url) => (url ? `<a href="${esc(url)}">${esc(text)}</a>` : esc(text));

export function experience({ experience }) {
  const full = experience.positions.filter((p) => !p.compact);
  const compact = experience.positions.filter((p) => p.compact);

  const rows = full.map((p) => entry({
    when: range(p),
    className: 'role',
    body: `
      <h3 class="role__org">${linked(p.org, p.url)}</h3>
      <p class="role__title">${inline([p.role, p.place].filter(Boolean).join(', '))}</p>
      ${p.summary ? `<p class="role__summary">${inline(p.summary)}</p>` : ''}`,
  }));

  const earlier = compact.map((p) => entry({
    when: range(p),
    className: 'role role--compact',
    body: `<p><span class="role__org-inline">${linked(p.org, p.url)}</span>, <span class="role__title">${inline([p.role, p.place].filter(Boolean).join(', '))}</span>. ${p.summary ? inline(p.summary) : ''}</p>`,
  }));

  return section({
    id: 'experience',
    title: 'Experience',
    className: 'experience',
    body: `
    ${list(rows, 'entries--roles')}
    ${earlier.length ? `<h3 class="subhead">Earlier</h3>${list(earlier, 'entries--compact')}` : ''}`,
  });
}

export function education({ experience }) {
  const rows = experience.education.map((e) => entry({
    when: range(e),
    className: 'role',
    body: `
      <h3 class="role__org">${esc(e.degree)}</h3>
      <p class="role__title">${inline(e.institution)}</p>
      ${e.summary ? `<p class="role__summary">${inline(e.summary)}</p>` : ''}`,
  }));
  return section({ id: 'education', title: 'Education', className: 'education', body: list(rows, 'entries--roles') });
}
