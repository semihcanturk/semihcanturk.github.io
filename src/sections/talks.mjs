import { esc, inline, smallCaps, listify } from '../lib/text.mjs';
import { monthYear, isoDate } from '../lib/dates.mjs';
import { section, entry, list } from './_parts.mjs';

// The same talk given at several places is listed once.
function groupByTitle(talks) {
  const groups = new Map();
  for (const t of talks) {
    const key = t.title.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, { ...t, given: [] });
    groups.get(key).given.push(t);
  }
  return [...groups.values()];
}

const where = (t) => [smallCaps(esc(t.event)), t.place && esc(t.place)].filter(Boolean).join(', ');

export function talks({ talks }) {
  const rows = groupByTitle(talks).map((t) => {
    const places = t.given.length === 1
      ? where(t)
      : listify(t.given.map((g) => `${where(g)} (${monthYear(g.date)})`));
    return entry({
      when: monthYear(t.date),
      datetime: isoDate(t.date),
      className: `talk${t.kind ? ' talk--kind' : ''}`,
      body: `
      <h3 class="talk__title">${t.url ? `<a href="${esc(t.url)}">${esc(t.title)}</a>` : esc(t.title)}</h3>
      <p class="talk__where">${t.kind ? `<span class="talk__kind">${esc(t.kind)}</span>, ` : ''}${places}</p>`,
    });
  });
  return section({ id: 'talks', title: 'Talks', className: 'talks', body: list(rows, 'entries--talks') });
}

export function teaching({ teaching }) {
  const rows = teaching.map((c) => entry({
    when: c.terms ?? '',
    className: 'course',
    body: `
      <h3 class="course__title">${esc(c.course)}${c.code ? ` <span class="course__code">${smallCaps(esc(c.code))}</span>` : ''}</h3>
      <p class="course__meta">${inline([c.role && c.instructor ? `${c.role} to ${c.instructor}` : c.role, c.institution].filter(Boolean).join(', '))}</p>`,
  }));
  return section({ id: 'teaching', title: 'Teaching', className: 'teaching', body: list(rows, 'entries--courses') });
}
