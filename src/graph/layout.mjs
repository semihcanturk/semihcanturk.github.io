// Graph layout, computed once at build time so the figure is static SVG.
//
// 1. Spectral seed: the two smallest non-trivial eigenvectors of the
//    normalized Laplacian (degree-scaled, as in Koren's "Drawing graphs
//    by eigenvectors").
// 2. Fruchterman–Reingold relaxation, fully deterministic, to pull apart
//    the nodes a spectral embedding stacks on top of each other
//    (co-authors who share exactly the same papers).
// 3. Rotate onto the principal axis and fit to the figure's box.
// 4. Optionally keep a clear disc around one hub node (my portrait).

/** Cyclic Jacobi eigen-decomposition of a symmetric matrix. */
export function eigenSymmetric(S) {
  const n = S.length;
  const a = S.map((row) => Float64Array.from(row));
  const v = Array.from({ length: n }, (_, i) => {
    const r = new Float64Array(n);
    r[i] = 1;
    return r;
  });
  for (let sweep = 0; sweep < 64; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2;
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-14) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p], vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const values = a.map((row, i) => row[i]);
  const order = values.map((_, i) => i).sort((i, j) => values[i] - values[j]);
  return {
    values: order.map((i) => values[i]),
    vector: (k) => v.map((row) => row[order[k]]), // k-th smallest eigenvector
  };
}

/** Small deterministic hash → [0, 1). Keeps the layout stable across builds. */
function rand01(str, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * @param {{id: string, charge?: number}[]} nodes  charge > 1 pushes a node harder away from others
 * @param {[number, number, number?][]} edges  index pairs, with an optional weight on the pull
 * @param {{width: number, height: number, pad: number, iterations?: number, hub?: {index: number, radius: number}}} box
 * @returns {{x: number, y: number}[]}
 */
export function layoutGraph(nodes, edges, box) {
  const n = nodes.length;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  for (const [i, j] of edges) A[i][j] = A[j][i] = 1;
  const deg = A.map((row) => row.reduce((s, x) => s + x, 0) || 1);

  // Normalized Laplacian  I − D^−½ A D^−½
  const L = A.map((row, i) => Array.from(row, (aij, j) => (i === j ? 1 : 0) - aij / Math.sqrt(deg[i] * deg[j])));
  const { vector } = eigenSymmetric(L);
  const u1 = vector(1).map((x, i) => x / Math.sqrt(deg[i]));
  const u2 = vector(2).map((x, i) => x / Math.sqrt(deg[i]));

  // Seed positions in a unit box; nudge structurally identical nodes apart.
  const norm = (u) => {
    const lo = Math.min(...u), hi = Math.max(...u);
    return u.map((x) => (hi - lo < 1e-12 ? 0 : (x - lo) / (hi - lo) - 0.5));
  };
  const sx = norm(u1), sy = norm(u2);
  let pos = nodes.map((nd, i) => ({
    x: sx[i] + (rand01(nd.id, 1) - 0.5) * 0.06,
    y: sy[i] + (rand01(nd.id, 2) - 0.5) * 0.06,
  }));

  // Fruchterman–Reingold
  const k = 0.95 * Math.sqrt(1 / n);
  const hub = box.hub?.index ?? -1;

  // `disc` (in layout units) makes the hub behave like a disc of that radius:
  // distances to it are measured from its rim, so the other nodes settle
  // around the portrait instead of underneath it.
  function relax(iterations, temp, disc = 0) {
    const cool = Math.pow(0.002 / temp, 1 / iterations);
    const gap = (i, j, d) => (disc && (i === hub || j === hub) ? Math.max(d - disc, k * 0.05) : d);
    for (let it = 0; it < iterations; it++) {
      const disp = pos.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
          let d = Math.hypot(dx, dy);
          if (d < 1e-6) { dx = 1e-3 * (rand01(nodes[i].id + nodes[j].id) - 0.5); dy = 1e-3; d = Math.hypot(dx, dy); }
          const f = ((k * k) / gap(i, j, d)) * (nodes[i].charge ?? 1) * (nodes[j].charge ?? 1);
          disp[i].x += (dx / d) * f; disp[i].y += (dy / d) * f;
          disp[j].x -= (dx / d) * f; disp[j].y -= (dy / d) * f;
        }
      }
      for (const [i, j, w = 1] of edges) {
        const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const f = (w * gap(i, j, d) ** 2) / k;
        disp[i].x -= (dx / d) * f; disp[i].y -= (dy / d) * f;
        disp[j].x += (dx / d) * f; disp[j].y += (dy / d) * f;
      }
      for (let i = 0; i < n; i++) {
        // gentle gravity keeps disconnected-looking lobes from drifting off
        disp[i].x -= pos[i].x * 0.6 * k;
        disp[i].y -= pos[i].y * 0.6 * k;
        const d = Math.hypot(disp[i].x, disp[i].y) || 1e-9;
        const step = Math.min(d, temp);
        pos[i].x += (disp[i].x / d) * step;
        pos[i].y += (disp[i].y / d) * step;
      }
      temp *= cool;
    }
  }

  relax(box.iterations ?? 600, 0.12);
  if (hub >= 0) {
    // Convert the portrait's radius to layout units (the figure is fitted to
    // the layout's spread afterwards), then relax again around it. Twice,
    // because the spread grows once the disc pushes nodes out.
    for (let round = 0; round < 2; round++) {
      const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
      const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const unitsPerPx = spread / (Math.max(box.width, box.height) - 2 * box.pad);
      relax(300, 0.04, (box.hub.radius + 14) * unitsPerPx);
    }
  }

  // Rotate so the longest spread runs along the figure's longer side.
  const cx = pos.reduce((s, p) => s + p.x, 0) / n;
  const cy = pos.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pos) { sxx += (p.x - cx) ** 2; syy += (p.y - cy) ** 2; sxy += (p.x - cx) * (p.y - cy); }
  let angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  if (box.height > box.width) angle += Math.PI / 2;
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  pos = pos.map((p) => ({ x: (p.x - cx) * cos - (p.y - cy) * sin, y: (p.x - cx) * sin + (p.y - cy) * cos }));
  if (box.flipX) pos = pos.map((p) => ({ x: -p.x, y: p.y }));
  if (box.flipY) pos = pos.map((p) => ({ x: p.x, y: -p.y }));

  // Fit: uniform scale, then allow a little stretch to fill the box.
  const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = box.width - 2 * box.pad, h = box.height - 2 * box.pad;
  let kx = w / (maxX - minX || 1), ky = h / (maxY - minY || 1);
  const uniform = Math.min(kx, ky), stretch = box.stretch ?? 1.2;
  kx = Math.min(kx, uniform * stretch);
  ky = Math.min(ky, uniform * stretch);
  const ox = box.pad + (w - (maxX - minX) * kx) / 2;
  const oy = box.pad + (h - (maxY - minY) * ky) / 2;
  const out = pos.map((p) => ({ x: ox + (p.x - minX) * kx, y: oy + (p.y - minY) * ky }));
  return box.hub ? clearHub(out, box.hub, box) : out;
}

// 4. Keep a clear disc around the hub (my portrait): nodes inside it slide
//    out along their own direction, then sideways off any node they land on.
function clearHub(pos, { index, radius }, box) {
  const hub = pos[index];
  const keep = radius + 16;
  const out = pos.map((p) => ({ ...p }));
  out.forEach((p, i) => {
    if (i === index) return;
    let dx = p.x - hub.x, dy = p.y - hub.y;
    let d = Math.hypot(dx, dy);
    if (d >= keep) return;
    if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
    p.x = hub.x + (dx / d) * keep;
    p.y = hub.y + (dy / d) * keep;
  });
  // Separate anything the push stacked together (rotate around the hub).
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (i === index || j === index) continue;
        const d = Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y);
        if (d >= 14) continue;
        for (const [k, sign] of [[i, -1], [j, 1]]) {
          const a = Math.atan2(out[k].y - hub.y, out[k].x - hub.x) + sign * 0.04;
          const r = Math.max(keep, Math.hypot(out[k].x - hub.x, out[k].y - hub.y));
          out[k].x = hub.x + Math.cos(a) * r;
          out[k].y = hub.y + Math.sin(a) * r;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  return out.map((p) => ({ x: clamp(p.x, box.pad * 0.5, box.width - box.pad * 0.5), y: clamp(p.y, box.pad * 0.5, box.height - box.pad * 0.5) }));
}
