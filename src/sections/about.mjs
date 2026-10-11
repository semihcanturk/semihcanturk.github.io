import { inline, paragraphs } from '../lib/text.mjs';
import { section } from './_parts.mjs';

export function about({ profile }) {
  const notes = [
    profile.languages && `I speak ${inline(profile.languages)}.`,
    profile.off_hours && `Away from research: ${inline(profile.off_hours)}.`,
  ].filter(Boolean).join(' ');

  return section({
    id: 'about',
    title: 'About',
    className: 'about',
    body: `
    <div class="about__text">
      <div class="prose">${paragraphs(profile.bio)}</div>
      ${notes ? `<p class="about__notes">${notes}</p>` : ''}
    </div>`,
  });
}
