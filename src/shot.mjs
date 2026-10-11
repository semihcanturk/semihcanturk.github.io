#!/usr/bin/env node
// Screenshots of the built site in headless Chrome, for reviewing design
// changes (by you, or by Claude). No dependencies: talks to Chrome over the
// DevTools protocol.
//
//   npm run shot                         desktop + phone, light, full page
//   npm run shot -- --widths 1440 --scheme dark
//   npm run shot -- --motion             let the graph animation play first
//   npm run shot -- --motion --wait 900  catch the animation part-way
//   npm run shot -- --palette ochre --typeset literata   try a theme without editing site.yaml
//   npm run shot -- --hover p:gpse-2024  hover a graph node before capturing
//   npm run shot -- --select "#papers"   capture just one element
//   npm run shot -- --eval "document.title"   print a JS expression's value (debugging)
//   npm run shot -- --url http://localhost:4321   shoot a running server (e.g. npm run dev)
//
// Output: .shots/<width>-<scheme>[-<n>].png

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, ROOT, OUT } from './build.mjs';
import { serve } from './lib/serve.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const widths = String(opt('widths', '1440,390')).split(',').map(Number);
const schemes = opt('scheme', 'light') === 'both' ? ['light', 'dark'] : [opt('scheme', 'light')];
const segment = Number(opt('segment', 1800));
const outDir = path.join(ROOT, opt('out', '.shots'));
const select = opt('select');
const hover = opt('hover');
const scale = Number(opt('scale', 1));

const CHROME = process.env.CHROME_PATH ?? [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(existsSync);
if (!CHROME) throw new Error('Chrome not found. Set CHROME_PATH.');

// Build (optionally with a temporary theme override), unless shooting a URL.
const external = opt('url');
if (!external) await build();
if (!external && (opt('palette') || opt('typeset'))) {
  const { build: devBuild } = await import('./build.mjs');
  await devBuild({ dev: true });
  const html = await readFile(path.join(OUT, 'index.html'), 'utf8');
  const pick = (kind, name) => (s) => s.replace(new RegExp(`(<link[^>]+data-${kind}="([^"]+)"[^>]*?)( media="not all")?>`, 'g'),
    (_, start, n) => `${start}${n === name ? '' : ' media="not all"'}>`);
  let out = html.replace(/<script src="dev\/devpanel\.js" defer><\/script>/, '');
  if (opt('palette')) out = pick('palette', opt('palette'))(out);
  if (opt('typeset')) out = pick('typeset', opt('typeset'))(out);
  await writeFile(path.join(OUT, 'index.html'), out);
}

const server = external ? null : await serve(OUT);
const base = external ?? `http://127.0.0.1:${server.address().port}/`;

const profile = path.join(os.tmpdir(), `shot-chrome-${process.pid}`);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  setTimeout(() => reject(new Error('Chrome did not start')), 15000);
});

// Minimal CDP client.
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const waiting = new Map();
const listeners = new Set();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    const { resolve, reject } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else {
    listeners.forEach((fn) => fn(msg));
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq;
  waiting.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
await page('Page.enable');
await page('Runtime.enable');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => (await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;

await mkdir(outDir, { recursive: true });
const written = [];

for (const scheme of schemes) {
  for (const width of widths) {
    const height = width < 600 ? 844 : 900;
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 600 });
    await page('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: scheme },
        { name: 'prefers-reduced-motion', value: flag('motion') ? 'no-preference' : 'reduce' },
      ],
    });
    const loaded = new Promise((r) => {
      const fn = (m) => { if (m.method === 'Page.loadEventFired') { listeners.delete(fn); r(); } };
      listeners.add(fn);
    });
    await page('Page.navigate', { url: base });
    await loaded;
    await evaluate('document.fonts.ready.then(() => true)');
    await sleep(Number(opt('wait', flag('motion') ? 4000 : 400)));

    if (hover) {
      const box = await evaluate(`(() => { const r = document.querySelector('[data-id="${hover}"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await page('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await sleep(300);
    }

    if (opt('eval')) {
      console.log(`[${width}-${scheme}]`, JSON.stringify(await evaluate(opt('eval')), null, 1));
    }

    // Grow the viewport to the whole page instead of using
    // captureBeyondViewport, which mis-paints large variable-font glyphs.
    const total = await evaluate('document.documentElement.scrollHeight');
    if (!flag('viewport')) {
      await page('Emulation.setDeviceMetricsOverride', { width, height: total, deviceScaleFactor: scale, mobile: width < 600 });
      await sleep(400);
    }

    const name = `${width}-${scheme}`;
    if (select) {
      const r = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(select)}).getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
      const { data } = await page('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
      const file = path.join(outDir, `${name}-${select.replace(/[^a-z0-9]+/gi, '')}.png`);
      await writeFile(file, Buffer.from(data, 'base64'));
      written.push(file);
      continue;
    }

    const parts = flag('viewport') ? 1 : Math.ceil(total / segment);
    for (let i = 0; i < parts; i++) {
      const y = i * segment;
      const h = flag('viewport') ? height : Math.min(segment, total - y);
      const { data } = await page('Page.captureScreenshot', { format: 'png', clip: { x: 0, y, width, height: h, scale: 1 } });
      const file = path.join(outDir, parts > 1 ? `${name}-${i + 1}.png` : `${name}.png`);
      await writeFile(file, Buffer.from(data, 'base64'));
      written.push(file);
    }
  }
}

ws.close();
chrome.kill();
server?.close();
await rm(profile, { recursive: true, force: true }).catch(() => {});
// Leave dist/ as a clean production build.
if (!external && (opt('palette') || opt('typeset'))) await build();
console.log(written.map((f) => path.relative(ROOT, f)).join('\n'));
