# CLAUDE.md

Personal website of **Semih Cantürk** (PhD candidate, Mila & Université de
Montréal; geometric/topological deep learning, graph representation learning).
A single static page generated from YAML, deployed to GitHub Pages.
Design rationale and the log of design decisions: **DESIGN.md**. Read it before
making visual changes, and add to its log when you change direction.

## Commands

```bash
npm run build    # content + theme → dist/  (what CI runs)
npm run dev      # http://localhost:4321, live reload, design panel
npm run shot     # screenshots → .shots/  (see flags at the top of src/shot.mjs)
```

Review visual changes with `npm run shot` before reporting them done. Useful
flags: `--widths 1440,390`, `--scheme dark|both`, `--viewport`,
`--select "#papers"`, `--hover p:gpse-2024` (graph node ids: `p:<paper-id>`,
`a:<name-slug>`), `--motion --wait 1100` (mid-animation),
`--palette X --typeset Y` (try a theme without editing site.yaml),
`--eval "<js>"` (print a value from the page).

## Architecture

- `content/*.yaml` — all text. `site.yaml` holds the theme choice, nav, section
  order (`[a, b]` = narrow column beside a section, `[a, b, c]` = three-column
  spread), Fig. 1 caption and flip, and colophon.
- `src/build.mjs` — loads content (`src/lib/content.mjs` validates and sorts),
  renders sections, writes `dist/`. Production concatenates
  `base + palette + typeset + site` CSS into `styles.css` and hoists each
  typeset's `@import` (Google Fonts) into `<head>`. Dev mode keeps theme files
  separate (inactive ones `media="not all"`) so the panel can switch them.
- `src/sections/*.mjs` — one template per section; `_parts.mjs` has the
  section wrapper, dated `entry` rows and the drawn-ü name.
- `src/graph/` — Fig. 1, the co-authorship graph (papers + people, bipartite).
  `layout.mjs`: normalized-Laplacian eigenvectors (Jacobi) as the seed, then a
  deterministic Fruchterman–Reingold relaxation and PCA rotation, then more
  relaxation around my node treated as a disc (it is drawn as the circular
  portrait from `profile.yaml → photo`). Frequent co-authors pull their papers
  more weakly (1/papers^1.2) so shared names don't bunch the papers up.
  `render.mjs`: SVG plus HTML labels, BFS hops for the draw-in animation.
  The caption claims this method, so keep the two in sync.
- `src/client/site.js` — graph hover/focus (neighbourhood highlight, tooltip
  placement, runtime label de-overlap) and BibTeX toggle/copy. The page must
  work without it.
- `src/client/devpanel.js` — dev-only design panel and live reload.
- `src/lib/text.mjs` — escaping, tiny inline markdown, automatic small caps
  for acronyms (`<span class="caps">`).

## Conventions

- **Tokens only.** `theme/site.css` never contains raw colors or font names;
  use the variables from `theme/base.css`, `theme/palettes/*.css` and
  `theme/typesets/*.css`. New look = new palette or typeset file.
- Every palette defines light and dark (both the `prefers-color-scheme` block
  and `[data-theme="dark"]`). Saffron (`--accent`) is for marks; the only
  saffron text is award labels, via `--accent-text` (deepened in light mode
  for contrast).
- Typesets define `--umlaut-*` offsets for the drawn ü; re-tune with
  `npm run shot -- --select ".hero__name"` after changing the display face.
- Keep copy plain and specific (see DESIGN.md → Writing). No eyebrow labels,
  no middle-dot meta strings, no arrows appended to links.
- Content edits go in YAML, not templates. If a field is missing, add it to the
  template and document it in that YAML file's header comment.
- Don't commit `dist/` or `.shots/`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes on push to `main`
(Pages source must be "GitHub Actions"). The home is a fresh
`semihcanturk/semihcanturk.github.io` repo; the old al-folio site was retired
rather than kept in this history. Confirm with the owner before pushing.
