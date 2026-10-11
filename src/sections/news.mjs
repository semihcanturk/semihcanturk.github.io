import { inline } from '../lib/text.mjs';
import { monthYear, isoDate } from '../lib/dates.mjs';
import { section, entry, list } from './_parts.mjs';

export function news({ news, site }) {
  const visible = site.news?.visible ?? 5;
  const rows = (items) => items.map((n, i) => entry({
    when: monthYear(n.date),
    datetime: isoDate(n.date),
    repeat: i > 0 && monthYear(items[i - 1].date) === monthYear(n.date),
    body: `<p>${inline(n.text)}</p>`,
  }));
  const recent = news.slice(0, visible);
  const older = news.slice(visible);

  return section({
    id: 'news',
    title: 'News',
    className: 'news',
    body: `
    ${list(rows(recent), 'entries--news')}
    ${older.length ? `
    <details class="more">
      <summary>Earlier news <span class="hint">(${older.length})</span></summary>
      ${list(rows(older), 'entries--news')}
    </details>` : ''}`,
  });
}
