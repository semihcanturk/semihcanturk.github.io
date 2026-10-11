import { esc, inline, smallCaps } from '../lib/text.mjs';
import { section, entry, list } from './_parts.mjs';

const GROUPS = [
  ['organizing', 'Organizing'],
  ['reviewing', 'Reviewing'],
  ['leadership', 'Leadership'],
];

export function service({ service }) {
  const body = GROUPS
    .filter(([key]) => (service[key] ?? []).length)
    .map(([key, label]) => {
      const rows = service[key].map((s) => entry({
        when: s.when ? String(s.when) : '',
        body: `<p>${smallCaps(esc(s.what ?? s.venue))}${s.award ? `, <strong class="award">${esc(s.award)}</strong>` : ''}</p>`,
      }));
      return `<h3 class="subhead">${label}</h3>${list(rows, 'entries--compact entries--service')}`;
    }).join('\n');
  return section({ id: 'service', title: 'Service', className: 'service', body });
}

export function awards({ awards }) {
  const rows = awards.map((a) => entry({
    when: a.when ? String(a.when) : '',
    className: 'award-row',
    body: `<p><span class="award-row__title">${inline(a.title)}</span>${a.by ? `<span class="award-row__by">${inline(a.by)}</span>` : ''}</p>`,
  }));
  return section({ id: 'awards', title: 'Awards', className: 'awards', body: list(rows, 'entries--compact entries--awards') });
}
