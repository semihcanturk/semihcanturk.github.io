#!/usr/bin/env node
// Local preview with live reload and the design panel.
//   npm run dev            → http://localhost:4321
//   PORT=8080 npm run dev  → another port

import { watch } from 'node:fs';
import path from 'node:path';
import { build, ROOT, OUT } from './build.mjs';
import { serve } from './lib/serve.mjs';

const PORT = Number(process.env.PORT ?? 4321);
const clients = new Set();
const send = (msg) => { for (const res of clients) res.write(`data: ${JSON.stringify(msg)}\n\n`); };

async function rebuild(reason) {
  try {
    const { ms } = await build({ dev: true });
    console.log(`${reason ? `${reason} → ` : ''}built in ${ms} ms`);
    return true;
  } catch (err) {
    console.error(`\n  ${err.message}\n`);
    send({ type: 'error', message: err.message });
    return false;
  }
}

await rebuild();

await serve(OUT, {
  port: PORT,
  onRequest(req, res) {
    if (req.url !== '/__events') return false;
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': hello\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return true;
  },
});
console.log(`\n  Preview: http://localhost:${PORT}\n  Edit content/*.yaml or theme/*.css; the page reloads by itself.\n`);

let timer;
let pending = new Set();
for (const dir of ['content', 'theme', 'src', 'assets']) {
  watch(path.join(ROOT, dir), { recursive: true }, (_, file) => {
    if (!file || file.startsWith('.')) return;
    pending.add(path.join(dir, file));
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const changed = [...pending];
      pending = new Set();
      const ok = await rebuild(changed.join(', '));
      if (!ok) return;
      // Theme-only edits swap stylesheets in place (keeps scroll and panel state).
      send({ type: changed.every((f) => f.startsWith('theme')) ? 'css' : 'reload' });
    }, 80);
  });
}
