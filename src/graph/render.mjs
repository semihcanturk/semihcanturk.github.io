// The collaboration graph: papers and the people on them, as a bipartite
// graph. Built from content/publications.yaml on every build, so a new
// paper (and new co-authors) appear in the figure automatically.

import { layoutGraph } from './layout.mjs';
import { esc, slug } from '../lib/text.mjs';
import { year } from '../lib/dates.mjs';

const cleanName = (name) => String(name).replace(/\*+\s*$/, '').trim();
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

// `photo` ({src, alt, note}) turns my node into a circular portrait of radius
// `photoRadius` (in the figure's 760-wide units); the layout keeps a clear
// disc around it.
export function buildCollaborationGraph(pubs, myName, {
  width = 760, height = 620, pad = 44, flipX = false, flipY = false, photo = null, photoRadius = 78,
} = {}) {
  const meId = `a:${slug(myName)}`;
  const nodes = [];
  const index = new Map();
  const edges = [];
  const add = (node) => {
    if (!index.has(node.id)) {
      index.set(node.id, nodes.length);
      nodes.push(node);
    }
    return index.get(node.id);
  };

  const hubR = photo?.src ? photoRadius : 8;
  add({ id: meId, kind: 'me', name: myName, papers: 0, charge: photo?.src ? 2.4 : 1.2 });
  for (const p of pubs) {
    // Papers repel more, so papers that share most of their authors still separate.
    const pi = add({ id: `p:${p.id}`, kind: 'paper', paper: p, charge: 2.6 });
    for (const raw of p.authors) {
      const name = cleanName(raw);
      const id = `a:${slug(name)}`;
      const ai = add({ id, kind: id === meId ? 'me' : 'person', name, papers: 0 });
      nodes[ai].papers += 1;
      edges.push([pi, ai]);
    }
  }

  // Hops from me, for the draw-in animation (me → papers → co-authors).
  const adj = nodes.map(() => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const hop = nodes.map(() => Infinity);
  hop[0] = 0;
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    for (const j of adj[i]) if (hop[j] === Infinity) { hop[j] = hop[i] + 1; queue.push(j); }
  }
  const maxHop = Math.max(...hop.filter(Number.isFinite));
  hop.forEach((h, i) => { if (!Number.isFinite(h)) hop[i] = maxHop + 1; });

  // Frequent co-authors pull each of their papers more weakly, so a handful
  // of shared names doesn't drag most papers into one corner: papers settle
  // around me, and the people they share sit between them.
  const weighted = edges.map(([a, b]) => [a, b, b === 0 ? 1 : 1 / nodes[b].papers ** 1.2]);
  const pos = layoutGraph(nodes, weighted, { width, height, pad, flipX, flipY, hub: { index: 0, radius: hubR } });
  const me = pos[0];
  const cx = pos.reduce((s, p) => s + p.x, 0) / pos.length;
  const cy = pos.reduce((s, p) => s + p.y, 0) / pos.length;
  // Where around me a node sits, 0…1 clockwise from the left: staggers the draw.
  const sweep = (i) => (Math.atan2(pos[i].y - me.y, pos[i].x - me.x) + Math.PI) / (2 * Math.PI);

  const radius = (nd) => (nd.kind === 'me' ? hubR : 2.6 + 1.5 * Math.sqrt(Math.max(0, nd.papers - 1)));

  // Edges leave my node from its rim, so the draw-in starts at the portrait's edge.
  const edgeSvg = edges.map(([a, b]) => {
    const [near, far] = hop[a] <= hop[b] ? [a, b] : [b, a];
    let { x: x1, y: y1 } = pos[near];
    const { x: x2, y: y2 } = pos[far];
    if (near === 0) {
      const d = Math.hypot(x2 - x1, y2 - y1) || 1;
      x1 += ((x2 - x1) / d) * hubR;
      y1 += ((y2 - y1) / d) * hubR;
    }
    return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" pathLength="1" data-a="${nodes[a].id}" data-b="${nodes[b].id}" style="--hop:${hop[far]};--sweep:${r3(sweep(far))}"/>`;
  }).join('');

  const nodeSvg = nodes.map((nd, i) => {
    const { x, y } = pos[i];
    const style = `--hop:${hop[i]};--sweep:${r3(sweep(i))}`;
    if (nd.kind === 'paper') {
      const p = nd.paper;
      const s = 5.5;
      const label = esc(p.title);
      const meta = esc(`${p.venue}, ${year(p.date)}`);
      return `<a href="#${esc(p.id)}" class="node node--paper${p.featured ? ' is-featured' : ''}" data-id="${nd.id}" data-label="${label}" data-meta="${meta}" aria-label="${label}" style="${style}"><rect x="${r1(x - s)}" y="${r1(y - s)}" width="${2 * s}" height="${2 * s}"/></a>`;
    }
    if (nd.kind === 'me' && photo?.src) {
      const r = hubR;
      return `<g class="node node--me node--photo" data-id="${nd.id}" data-label="${esc(nd.name)}" data-meta="${esc(photo.note ?? 'That’s me')}" role="img" aria-label="${esc(photo.alt ?? nd.name)}" style="${style}">`
        + `<clipPath id="graph-me-clip"><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/></clipPath>`
        + `<circle class="node__back" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`
        + `<image href="${esc(photo.src)}" x="${r1(x - r)}" y="${r1(y - r)}" width="${r1(2 * r)}" height="${r1(2 * r)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#graph-me-clip)"/>`
        + `<circle class="node__ring" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/></g>`;
    }
    const meta = nd.kind === 'me' ? 'That’s me' : `${nd.papers} paper${nd.papers === 1 ? '' : 's'} together`;
    return `<circle class="node node--${nd.kind}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(radius(nd))}" data-id="${nd.id}" data-label="${esc(nd.name)}" data-meta="${esc(meta)}" style="${style}"/>`;
  }).join('');

  // Paper labels sit beside their node, on whichever side runs into fewer
  // other nodes (and never into my portrait); ties go away from the centre.
  // Overlaps are nudged apart here for the desktop size (where the figure
  // renders at about 1:1); site.js redoes this at the actual size.
  const clash = (x0, w, y) => pos.reduce((n, p, j) => {
    if (j === 0) {
      const nearX = Math.max(x0, Math.min(p.x, x0 + w));
      return n + (Math.hypot(nearX - p.x, Math.max(0, Math.abs(y - p.y) - 9)) < hubR + 4 ? 100 : 0);
    }
    return n + (p.x > x0 - 8 && p.x < x0 + w + 8 && Math.abs(p.y - y) < 12 ? 1 : 0);
  }, 0);
  const placed = nodes.map((nd, i) => {
    if (nd.kind !== 'paper') return null;
    const { x, y } = pos[i];
    const text = nd.paper.short ?? nd.paper.id;
    const w = text.length * 7.4 + 10;
    const away = x - cx >= 0 ? 'right' : 'left';
    const cost = { right: clash(x + 6, w, y), left: clash(x - 6 - w, w, y) };
    const side = cost.left === cost.right ? away : cost.left < cost.right ? 'left' : 'right';
    return { i, nd, text, side, x, y, dy: 0, w, x0: side === 'right' ? x : x - w, h: 18 };
  }).filter(Boolean);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (const a of placed) {
      for (const b of placed) {
        if (a === b || a.x0 > b.x0 + b.w || b.x0 > a.x0 + a.w) continue;
        const overlap = a.h - Math.abs(a.y + a.dy - (b.y + b.dy));
        if (overlap <= 0) continue;
        a.dy += ((a.y + a.dy < b.y + b.dy || (a.y + a.dy === b.y + b.dy && a.i < b.i)) ? -1 : 1) * (overlap + 1) / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const labels = placed.map(({ i, nd, text, side, x, y, dy }) =>
    `<span class="graph__label graph__label--${side}" data-for="${nd.id}" data-side="${side}" style="left:${r3((x / width) * 100)}%;top:${r3((y / height) * 100)}%;--dy:${r1(dy)}px;--hop:${hop[i]};--sweep:${r3(sweep(i))}">${esc(text)}</span>`).join('');

  const stats = {
    papers: nodes.filter((n) => n.kind === 'paper').length,
    people: nodes.filter((n) => n.kind === 'person').length,
  };

  const svg = `<svg class="graph__svg" viewBox="0 0 ${width} ${height}" aria-hidden="false" focusable="false"><g class="graph__edges">${edgeSvg}</g><g class="graph__nodes">${nodeSvg}</g></svg>`;
  const hub = { x: r3((me.x / width) * 100), y: r3((me.y / height) * 100), r: r3((hubR / width) * 100) };
  return { svg, labels, stats, width, height, hub };
}
