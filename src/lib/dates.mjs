// Dates in the YAML are loose: 2024, "2024-03", 2024-03-27 (a Date), "present".

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/** → { y, m?, d? } | { present: true } | null */
export function parseDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() };
  if (typeof v === 'number') return { y: v };
  const s = String(v).trim().toLowerCase();
  if (s === 'present' || s === 'now') return { present: true };
  const m = s.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) throw new Error(`Can't read the date "${v}". Use YYYY, YYYY-MM or YYYY-MM-DD.`);
  return { y: +m[1], m: m[2] ? +m[2] : undefined, d: m[3] ? +m[3] : undefined };
}

/** Sortable number; "present" sorts last. */
export function dateKey(v) {
  const p = parseDate(v);
  if (!p) return 0;
  if (p.present) return 99999999;
  return p.y * 10000 + (p.m ?? 0) * 100 + (p.d ?? 0);
}

export const year = (v) => parseDate(v)?.y;

/** "Nov 2024" or "2024" */
export function monthYear(v) {
  const p = parseDate(v);
  if (!p) return '';
  if (p.present) return 'present';
  return p.m ? `${MONTHS[p.m - 1]} ${p.y}` : String(p.y);
}

/** ISO-ish string for <time datetime>. */
export function isoDate(v) {
  const p = parseDate(v);
  if (!p || p.present) return '';
  return [p.y, p.m && String(p.m).padStart(2, '0'), p.d && String(p.d).padStart(2, '0')]
    .filter(Boolean).join('-');
}

/** "Mar–Dec 2024", "2019–2024", "2022–present", "Summer 2016" (via `when`). */
export function range({ start, end, when }) {
  if (when) return String(when);
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a) return '';
  if (!b) return monthYear(start);
  if (b.present) return `${a.y}–present`;
  if (a.y === b.y) {
    if (a.m && b.m && a.m !== b.m) return `${MONTHS[a.m - 1]}–${MONTHS[b.m - 1]} ${a.y}`;
    return monthYear(start);
  }
  return `${a.y}–${b.y}`;
}

export function longMonthYear(date = new Date()) {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}
