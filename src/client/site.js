// Small enhancements; the page works without them.

// --- Fig. 1: point at a node to light up its neighbourhood ----------------
(() => {
  const root = document.querySelector('[data-graph]');
  if (!root) return;
  const tip = root.querySelector('.graph__tip');
  const nodes = new Map([...root.querySelectorAll('.node[data-id]')].map((el) => [el.dataset.id, el]));
  const labels = new Map([...root.querySelectorAll('.graph__label[data-for]')].map((el) => [el.dataset.for, el]));
  const edges = [...root.querySelectorAll('line[data-a]')];
  const adjacent = new Map();
  for (const e of edges) {
    for (const [x, y] of [[e.dataset.a, e.dataset.b], [e.dataset.b, e.dataset.a]]) {
      if (!adjacent.has(x)) adjacent.set(x, new Set());
      adjacent.get(x).add(y);
    }
  }
  let current = null;

  function show(id) {
    if (id === current) return;
    clear();
    current = id;
    const lit = new Set([id, ...(adjacent.get(id) ?? [])]);
    root.classList.add('is-focused');
    for (const nid of lit) {
      nodes.get(nid)?.classList.add('is-lit');
      labels.get(nid)?.classList.add('is-lit');
    }
    nodes.get(id)?.classList.add('is-current');
    for (const e of edges) if (e.dataset.a === id || e.dataset.b === id) e.classList.add('is-lit');

    const el = nodes.get(id);
    tip.innerHTML = '';
    const name = document.createElement('strong');
    name.textContent = el.dataset.label;
    const meta = document.createElement('span');
    meta.textContent = el.dataset.meta;
    tip.append(name, meta);
    tip.hidden = false;
    placeTip(el, [...(adjacent.get(id) ?? [])].map((n) => nodes.get(n)).filter(Boolean));
  }

  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // Try eight spots around the node (outside its edges, so a large node like
  // the portrait isn't covered) and keep the one that hides the fewest of
  // the nodes being pointed out, so the tip never covers its own answer.
  function placeTip(el, neighbours) {
    const box = root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const c = centre(el);
    const points = neighbours.map(centre);
    const w = tip.offsetWidth, h = tip.offsetHeight, g = 10;
    const vw = document.documentElement.clientWidth;
    const right = r.right + g, left = r.left - g - w, above = r.top - g - h, below = r.bottom + g;
    const spots = [
      [right, c.y - h / 2], [left, c.y - h / 2],
      [c.x - w / 2, above], [c.x - w / 2, below],
      [right, above], [left, above],
      [right, below], [left, below],
    ];
    let best = spots[0], bestScore = Infinity;
    spots.forEach(([x, y], order) => {
      const hidden = points.filter((p) => p.x > x - 8 && p.x < x + w + 8 && p.y > y - 8 && p.y < y + h + 8).length;
      const offscreen = x < 8 || x + w > vw - 8 ? 100 : 0;
      const score = hidden * 10 + offscreen + order * 0.1;
      if (score < bestScore) { bestScore = score; best = [x, y]; }
    });
    const x = Math.min(Math.max(best[0], 8), vw - 8 - w);
    tip.style.left = `${x - box.left}px`;
    tip.style.top = `${best[1] - box.top}px`;
  }

  // Labels: keep them on screen and off each other at the rendered size.
  function placeLabels() {
    const vw = document.documentElement.clientWidth;
    const items = [...labels.values()];
    for (const el of items) {
      el.style.setProperty('--dy', '0px');
      el.classList.toggle('graph__label--left', el.dataset.side === 'left');
      el.classList.toggle('graph__label--right', el.dataset.side !== 'left');
      const r = el.getBoundingClientRect();
      if (r.right > vw - 4 || r.left < 4) {
        const left = el.classList.contains('graph__label--left');
        el.classList.toggle('graph__label--left', !left);
        el.classList.toggle('graph__label--right', left);
      }
    }
    const boxes = items.map((el) => ({ el, r: el.getBoundingClientRect(), dy: 0 }));
    for (let pass = 0; pass < 30; pass++) {
      let moved = false;
      for (const a of boxes) {
        for (const b of boxes) {
          if (a === b || a.r.left > b.r.right || b.r.left > a.r.right) continue;
          const ay = a.r.top + a.dy, by = b.r.top + b.dy;
          const overlap = a.r.height + 2 - Math.abs(ay - by);
          if (overlap <= 0) continue;
          a.dy += (ay <= by ? -1 : 1) * overlap / 2;
          moved = true;
        }
      }
      if (!moved) break;
    }
    for (const b of boxes) b.el.style.setProperty('--dy', `${Math.round(b.dy)}px`);
  }
  placeLabels();
  document.fonts?.ready.then(placeLabels);
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(placeLabels, 120); });

  function clear() {
    if (!current) return;
    current = null;
    root.classList.remove('is-focused');
    root.querySelectorAll('.is-lit, .is-current').forEach((el) => el.classList.remove('is-lit', 'is-current'));
    tip.hidden = true;
  }

  const nodeOf = (target) => target.closest?.('.node[data-id]');
  root.addEventListener('pointerover', (e) => { const n = nodeOf(e.target); if (n) show(n.dataset.id); });
  root.addEventListener('pointerout', (e) => {
    const n = nodeOf(e.target);
    if (n && !n.contains(e.relatedTarget)) clear();
  });
  root.addEventListener('focusin', (e) => { const n = nodeOf(e.target); if (n) show(n.dataset.id); });
  root.addEventListener('focusout', clear);
  // Touch: a tap on a person shows their name; a tap elsewhere clears.
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const n = nodeOf(e.target);
    if (n) show(n.dataset.id); else clear();
  });
})();

// --- BibTeX: show the entry, copy it ---------------------------------------
document.querySelectorAll('[data-bib-toggle]').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
  });
});

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const pre = btn.parentElement.querySelector('pre');
  try {
    await navigator.clipboard.writeText(pre.textContent);
    btn.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(pre);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    btn.textContent = 'Selected: press Ctrl/⌘ C';
  }
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
});
