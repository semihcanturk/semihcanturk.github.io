// Loads content/*.yaml, checks the fields the templates rely on, and
// returns one object. Errors name the file and entry so they're easy to fix.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { dateKey } from './dates.mjs';

const FILES = ['site', 'profile', 'news', 'publications', 'experience', 'talks', 'teaching', 'service', 'awards'];

class ContentError extends Error {}

async function loadYaml(dir, name) {
  const file = path.join(dir, `${name}.yaml`);
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    return undefined; // optional files may be missing
  }
  try {
    return yaml.load(text);
  } catch (err) {
    throw new ContentError(`content/${name}.yaml: ${err.reason ?? err.message} (line ${(err.mark?.line ?? 0) + 1})`);
  }
}

function need(obj, fields, where) {
  for (const f of fields) {
    if (obj?.[f] == null || obj[f] === '') throw new ContentError(`${where} is missing "${f}".`);
  }
}

export async function loadContent(root) {
  const dir = path.join(root, 'content');
  const c = Object.fromEntries(await Promise.all(FILES.map(async (n) => [n, await loadYaml(dir, n)])));

  need(c.site, ['title', 'sections'], 'content/site.yaml');
  need(c.profile, ['name'], 'content/profile.yaml');

  c.news = (c.news ?? []).map((item, i) => {
    need(item, ['date', 'text'], `content/news.yaml, item ${i + 1}`);
    return item;
  });

  const ids = new Set();
  c.publications = (c.publications ?? []).map((p, i) => {
    const where = `content/publications.yaml, entry ${i + 1}${p?.title ? ` ("${p.title}")` : ''}`;
    need(p, ['id', 'title', 'date', 'authors', 'venue'], where);
    if (ids.has(p.id)) throw new ContentError(`${where}: the id "${p.id}" is used twice.`);
    ids.add(p.id);
    if (!Array.isArray(p.authors)) throw new ContentError(`${where}: "authors" should be a list.`);
    return { ...p, links: p.links ?? {} };
  }).sort((a, b) => dateKey(b.date) - dateKey(a.date));

  c.experience = c.experience ?? {};
  c.experience.positions = (c.experience.positions ?? []).map((p, i) => {
    need(p, ['org', 'role'], `content/experience.yaml, position ${i + 1}`);
    return p;
  });
  c.experience.education = (c.experience.education ?? []).map((e, i) => {
    need(e, ['degree', 'institution'], `content/experience.yaml, education ${i + 1}`);
    return e;
  });

  c.talks = (c.talks ?? []).map((t, i) => {
    need(t, ['title', 'date'], `content/talks.yaml, talk ${i + 1}`);
    return t;
  }).sort((a, b) => dateKey(b.date) - dateKey(a.date));

  c.teaching = c.teaching ?? [];
  c.service = c.service ?? {};
  c.awards = c.awards ?? [];
  return c;
}

export { ContentError };
