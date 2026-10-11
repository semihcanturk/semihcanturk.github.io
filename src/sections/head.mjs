// <head>: metadata, social previews, structured data, fonts and styles.

import { esc, squish } from '../lib/text.mjs';

export function head({ site, profile, fonts, styles }) {
  const url = (site.url ?? '').replace(/\/$/, '');
  const desc = squish(site.description ?? '');
  const sameAs = (profile.links ?? []).map((l) => l.url);
  const image = profile.photo?.share ?? profile.photo?.src;
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: url || undefined,
    image: url && image ? `${url}/${image}` : undefined,
    email: profile.email ? `mailto:${profile.email}` : undefined,
    jobTitle: 'PhD candidate',
    affiliation: [
      { '@type': 'Organization', name: 'Mila – Quebec AI Institute' },
      { '@type': 'CollegeOrUniversity', name: 'Université de Montréal' },
    ],
    sameAs,
  };

  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.title)}</title>
<meta name="description" content="${esc(desc)}">
${url ? `<link rel="canonical" href="${esc(url)}/">` : ''}
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(desc)}">
${url && image ? `<meta property="og:image" content="${esc(url)}/${esc(image)}">` : ''}
${url ? `<meta property="og:url" content="${esc(url)}/">` : ''}
<meta name="twitter:card" content="summary">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts.map((href) => `<link rel="stylesheet" href="${esc(href)}">`).join('\n')}
${styles}
<script type="application/ld+json">${JSON.stringify(person)}</script>
</head>`;
}
