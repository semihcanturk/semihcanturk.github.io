import { esc, inline } from '../lib/text.mjs';
import { longMonthYear } from '../lib/dates.mjs';
import { section } from './_parts.mjs';

export function contact({ profile, site, builtAt }) {
  const links = (profile.links ?? []).map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`).join('');
  return section({
    id: 'contact',
    title: 'Contact',
    className: 'contact',
    body: `
    <p class="contact__lead">Write to me at <a class="contact__email" href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></p>
    ${profile.cv ? `<p class="contact__cv">Or take <a href="${esc(profile.cv)}">my CV</a> with you (PDF).</p>` : ''}
    <ul class="contact__links" role="list">${links}</ul>`,
  });
}

export function colophon({ profile, site, builtAt }) {
  return `
<footer class="colophon">
  <p>© ${builtAt.getFullYear()} ${esc(profile.name)}. ${site.colophon ? inline(site.colophon) : ''} Updated ${longMonthYear(builtAt)}.</p>
  <p><a href="#top">Back to top</a></p>
</footer>`;
}
