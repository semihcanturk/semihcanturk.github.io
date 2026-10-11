// Design panel + live reload. Only loaded by `npm run dev`, never deployed.
(() => {
  const D = window.__DESIGN__;
  const root = document.documentElement;
  const TOKENS = ['--paper', '--ink', '--ink-soft', '--ink-faint', '--glaze', '--accent', '--accent-soft', '--accent-text'];
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(`design:${k}`)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(`design:${k}`, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  // --- Live reload ---------------------------------------------------------
  const events = new EventSource('/__events');
  events.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'reload') location.reload();
    if (msg.type === 'css') {
      document.querySelectorAll('link[rel="stylesheet"][href^="theme/"]').forEach((l) => {
        l.href = `${l.href.split('?')[0]}?t=${Date.now()}`;
      });
      setTimeout(syncColors, 150);
      hideError();
    }
    if (msg.type === 'error') showError(msg.message);
  };
  let errorBox;
  function showError(text) {
    errorBox ??= Object.assign(document.createElement('pre'), { className: 'dp-error' });
    errorBox.textContent = `Build error\n\n${text}`;
    document.body.append(errorBox);
  }
  function hideError() { errorBox?.remove(); }

  // --- Switching -----------------------------------------------------------
  const state = { palette: D.palette, typeset: D.typeset, ...store.get('state') };
  delete state.scheme; // light/dark is the page's own button now
  function apply() {
    document.querySelectorAll('link[data-palette]').forEach((l) => { l.media = l.dataset.palette === state.palette ? 'all' : 'not all'; });
    document.querySelectorAll('link[data-typeset]').forEach((l) => { l.media = l.dataset.typeset === state.typeset ? 'all' : 'not all'; });
    store.set('state', state);
    setTimeout(syncColors, 120);
  }

  // --- Panel ---------------------------------------------------------------
  const css = `
  .dp{position:fixed;right:12px;bottom:12px;z-index:9999;width:268px;font:12px/1.35 -apple-system,system-ui,sans-serif;color:#111;background:#fff;border:1px solid #0002;box-shadow:0 6px 24px #0002;border-radius:8px;font-style:normal;letter-spacing:0}
  .dp summary{cursor:pointer;padding:8px 10px;font-weight:600;list-style:none}
  .dp summary::-webkit-details-marker{display:none}
  .dp .dp-body{padding:0 10px 10px;display:grid;gap:8px}
  .dp label{display:grid;grid-template-columns:76px 1fr;align-items:center;gap:6px}
  .dp select,.dp button{font:inherit;padding:3px 6px;border:1px solid #0003;border-radius:4px;background:#fff;color:#111}
  .dp button{cursor:pointer}
  .dp .dp-colors{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}
  .dp .dp-colors label{grid-template-columns:22px 1fr;font-family:ui-monospace,monospace;font-size:11px}
  .dp input[type=color]{width:22px;height:22px;padding:0;border:1px solid #0003;border-radius:4px;background:none}
  .dp .dp-row{display:flex;gap:6px;flex-wrap:wrap}
  .dp .dp-note{color:#666}
  .dp-error{position:fixed;inset:auto 12px 12px 12px;z-index:10000;max-height:50vh;overflow:auto;margin:0;padding:14px;background:#2b0b0b;color:#ffd7d7;font:12px/1.5 ui-monospace,monospace;border-radius:8px;white-space:pre-wrap}`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const opts = (list, sel) => list.map((x) => `<option${x === sel ? ' selected' : ''}>${x}</option>`).join('');
  const panel = document.createElement('details');
  panel.className = 'dp';
  panel.open = store.get('open') ?? true;
  panel.innerHTML = `
    <summary>Design</summary>
    <div class="dp-body">
      <label>Palette <select data-k="palette">${opts(D.palettes, state.palette)}</select></label>
      <label>Typeset <select data-k="typeset">${opts(D.typesets, state.typeset)}</select></label>
      <div class="dp-colors">${TOKENS.map((t) => `<label><input type="color" data-token="${t}">${t.slice(2)}</label>`).join('')}</div>
      <div class="dp-row">
        <button data-act="copy-theme">Copy site.yaml theme</button>
        <button data-act="copy-colors">Copy colors CSS</button>
        <button data-act="reset">Reset colors</button>
      </div>
      <div class="dp-note">Light/dark: the circle in the top bar. Color edits are temporary until pasted into theme/palettes/&lt;name&gt;.css.</div>
    </div>`;
  document.body.append(panel);
  panel.addEventListener('toggle', () => store.set('open', panel.open));

  panel.addEventListener('change', (e) => {
    const k = e.target.dataset.k;
    if (k) {
      state[k] = e.target.value;
      if (k === 'palette') resetColors();
      apply();
    }
  });
  panel.addEventListener('input', (e) => {
    const t = e.target.dataset.token;
    if (t) root.style.setProperty(t, e.target.value);
  });

  function toHex(value) {
    const ctx = toHex.ctx ??= document.createElement('canvas').getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillStyle = value.trim();
    return ctx.fillStyle;
  }
  function syncColors() {
    const cs = getComputedStyle(root);
    panel.querySelectorAll('[data-token]').forEach((i) => { i.value = toHex(cs.getPropertyValue(i.dataset.token)); });
  }
  function resetColors() { TOKENS.forEach((t) => root.style.removeProperty(t)); }

  panel.addEventListener('click', async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    if (act === 'reset') { resetColors(); syncColors(); return; }
    const text = act === 'copy-theme'
      ? `theme:\n  palette: ${state.palette}\n  typeset: ${state.typeset}\n  color_scheme: ${root.dataset.theme ?? 'auto'}`
      : `/* ${state.palette}${root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches) ? ' (dark)' : ''} */\n:root {\n${TOKENS.map((t) => `  ${t}: ${toHex(getComputedStyle(root).getPropertyValue(t))};`).join('\n')}\n}`;
    try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; } catch { prompt('Copy:', text); }
    setTimeout(() => { e.target.textContent = act === 'copy-theme' ? 'Copy site.yaml theme' : 'Copy colors CSS'; }, 1500);
  });

  // Keep the color inputs in step when the page's button switches light/dark.
  new MutationObserver(() => setTimeout(syncColors, 60)).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  apply();
})();
