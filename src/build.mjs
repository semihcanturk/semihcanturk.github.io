#!/usr/bin/env node
// Builds the site: content/*.yaml + theme/*.css → dist/
//
//   npm run build        production build (what GitHub Pages serves)
//   build({ dev: true }) used by `npm run dev`: keeps theme files separate
//                        and adds the design panel + live reload.

import { mkdir, readFile, writeFile, cp, rm, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadContent, ContentError } from './lib/content.mjs';
import { buildCollaborationGraph } from './graph/render.mjs';
import { head } from './sections/head.mjs';
import { masthead, hero } from './sections/hero.mjs';
import { about } from './sections/about.mjs';
import { news } from './sections/news.mjs';
import { papers } from './sections/papers.mjs';
import { experience, education } from './sections/experience.mjs';
import { talks, teaching } from './sections/talks.mjs';
import { service, awards } from './sections/service.mjs';
import { contact, colophon } from './sections/contact.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'dist');

// Section names usable in content/site.yaml → `sections:`
const SECTIONS = { hero, about, news, papers, experience, education, talks, teaching, service, awards, contact };

const IMPORT_RE = /@import\s+url\(\s*["']?([^"')]+)["']?\s*\)\s*;?/g;

async function themeNames(kind) {
  return (await readdir(path.join(ROOT, 'theme', kind))).filter((f) => f.endsWith('.css')).map((f) => f.slice(0, -4)).sort();
}

async function readTheme(rel) {
  const css = await readFile(path.join(ROOT, 'theme', rel), 'utf8');
  return { css: css.replace(IMPORT_RE, '').trim(), fonts: [...css.matchAll(IMPORT_RE)].map((m) => m[1]) };
}

const shortHash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);

export async function build({ dev = false } = {}) {
  const started = Date.now();
  const c = await loadContent(ROOT);

  const palettes = await themeNames('palettes');
  const typesets = await themeNames('typesets');
  const palette = c.site.theme?.palette ?? 'cobalt';
  const typeset = c.site.theme?.typeset ?? 'spectral';
  if (!palettes.includes(palette)) throw new ContentError(`content/site.yaml: no palette "${palette}". Choose one of: ${palettes.join(', ')}.`);
  if (!typesets.includes(typeset)) throw new ContentError(`content/site.yaml: no typeset "${typeset}". Choose one of: ${typesets.join(', ')}.`);
  const unknown = c.site.sections.flat().filter((s) => !SECTIONS[s]);
  if (unknown.length) throw new ContentError(`content/site.yaml: unknown section "${unknown[0]}". Available: ${Object.keys(SECTIONS).join(', ')}.`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // --- Styles -------------------------------------------------------------
  let styles;
  let fonts = [];
  if (dev) {
    // Separate files, so the design panel can switch palettes/typesets live.
    await cp(path.join(ROOT, 'theme'), path.join(OUT, 'theme'), { recursive: true });
    const off = (on) => (on ? '' : ' media="not all"');
    styles = [
      '<link rel="stylesheet" href="theme/base.css">',
      ...palettes.map((p) => `<link rel="stylesheet" href="theme/palettes/${p}.css" data-palette="${p}"${off(p === palette)}>`),
      ...typesets.map((t) => `<link rel="stylesheet" href="theme/typesets/${t}.css" data-typeset="${t}"${off(t === typeset)}>`),
      '<link rel="stylesheet" href="theme/site.css">',
    ].join('\n');
  } else {
    const parts = await Promise.all(['base.css', `palettes/${palette}.css`, `typesets/${typeset}.css`, 'site.css'].map(readTheme));
    fonts = parts.flatMap((p) => p.fonts);
    const css = parts.map((p) => p.css).join('\n\n');
    await writeFile(path.join(OUT, 'styles.css'), css);
    styles = `<link rel="stylesheet" href="styles.css?v=${shortHash(css)}">`;
  }

  // --- Scripts & assets ---------------------------------------------------
  const siteJs = await readFile(path.join(ROOT, 'src/client/site.js'), 'utf8');
  await writeFile(path.join(OUT, 'site.js'), siteJs);
  await cp(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  await writeFile(path.join(OUT, '.nojekyll'), '');

  // --- Page ---------------------------------------------------------------
  const { caption: _caption, photo_radius: photoRadius, ...graphOptions } = c.site.graph ?? {};
  const graph = buildCollaborationGraph(c.publications, c.profile.name, { ...graphOptions, photoRadius, photo: c.profile.photo });
  const ctx = { ...c, graph, builtAt: new Date() };
  const scheme = c.site.theme?.color_scheme;
  const themeAttr = scheme === 'light' || scheme === 'dark' ? ` data-theme="${scheme}"` : '';

  const devExtras = dev
    ? `<script>window.__DESIGN__=${JSON.stringify({ palettes, typesets, palette, typeset })}</script>
<script src="dev/devpanel.js" defer></script>`
    : '';
  if (dev) {
    await mkdir(path.join(OUT, 'dev'), { recursive: true });
    await cp(path.join(ROOT, 'src/client/devpanel.js'), path.join(OUT, 'dev/devpanel.js'));
  }

  // A nested list in `sections:` sets those sections side by side as a spread.
  const body = c.site.sections.map((item) => (Array.isArray(item)
    ? `<div class="spread spread--${item.length}">${item.map((name) => SECTIONS[name](ctx)).join('\n')}</div>`
    : SECTIONS[item](ctx))).join('\n');
  const html = `<!doctype html>
<html lang="${c.site.lang ?? 'en'}"${themeAttr}>
${head({ site: c.site, profile: c.profile, fonts, styles })}
<body>
${masthead(ctx)}
<main id="main">
${body}
</main>
${colophon(ctx)}
<script src="site.js?v=${shortHash(siteJs)}" defer></script>
${devExtras}
</body>
</html>
`;
  await writeFile(path.join(OUT, 'index.html'), html);

  const notFound = `<!doctype html>
<html lang="${c.site.lang ?? 'en'}"${themeAttr}>
${head({ site: { ...c.site, title: `Not found · ${c.site.title}` }, profile: c.profile, fonts, styles })}
<body>
<main class="not-found">
  <h1 class="not-found__title">Nothing here</h1>
  <p>This page doesn’t exist. <a href="/">Go to the homepage</a>.</p>
</main>
</body>
</html>
`;
  await writeFile(path.join(OUT, '404.html'), notFound);

  return { ms: Date.now() - started, stats: graph.stats };
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build()
    .then(({ ms, stats }) => console.log(`Built dist/ in ${ms} ms (${stats.papers} papers, ${stats.people} co-authors).`))
    .catch((err) => {
      console.error(err instanceof ContentError ? `\n  ${err.message}\n` : err);
      process.exit(1);
    });
}
