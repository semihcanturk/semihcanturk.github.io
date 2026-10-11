# semihcanturk.github.io

Personal website of Semih Cantürk. A single static page built from YAML by a
small Node script. No framework, one dependency (`js-yaml`).

```
content/    what the site says     ← edit these to update the site
theme/      how it looks           ← colors, fonts, sizes, layout
assets/     portrait, CV, favicon
src/        the build (templates, graph layout, dev server, screenshots)
dist/       the built site (generated, not committed)
```

## Preview locally

```bash
npm install        # first time only
npm run dev        # http://localhost:4321, reloads as you edit
```

The dev page has a **Design** panel in the bottom-right corner (dev only, never
deployed): switch palettes, typesets and light/dark, and edit colors live.

## Update content

Everything lives in `content/*.yaml`. Each file starts with a comment that
explains its fields. Text fields accept `[links](https://…)`, `**bold**` and
`*italic*`.

| To…                       | Edit                         | How                                                                 |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Add a paper               | `content/publications.yaml`  | Copy an entry, change it. Order doesn't matter (sorted by date). Your co-authors join the graph at the top automatically. |
| Feature a paper           | `content/publications.yaml`  | `featured: true` plus a `summary:` (shown beside the paper on wide screens) |
| Mark equal contribution   | `content/publications.yaml`  | Add `*` after the name: `- Semih Cantürk*`                          |
| Add news                  | `content/news.yaml`          | Add an item at the top. Link a paper on the page with `[GPSE](#gpse-2024)` |
| Add a position            | `content/experience.yaml`    | Add to `positions:` (shown in the order written)                    |
| Add a talk                | `content/talks.yaml`         | Add an entry; repeat talks with the same title are grouped          |
| Teaching, service, awards | `content/teaching.yaml` …    |                                                                     |
| Bio, links, photo, CV     | `content/profile.yaml`       | Replace `assets/portrait.jpg` (square, face centred: it is the middle of the graph) or `assets/semih-canturk-cv.pdf` |
| Reorder or hide sections  | `content/site.yaml`          | `sections:` list; `[a, b]` sets a narrow column beside a section, `[a, b, c]` a three-column spread |
| Figure caption            | `content/site.yaml`          | `graph: caption:`; `{papers}` and `{people}` become the counts      |

If a YAML file has a mistake, the build (and the dev page) tells you which file
and entry.

## Change the look

- **Pick a preset:** `content/site.yaml → theme:` chooses a palette
  (`theme/palettes/`) and a typeset (`theme/typesets/`). Try them first in the
  dev panel.
- **Tweak colors:** edit the hex values in `theme/palettes/<name>.css`, or
  adjust them in the dev panel and press *Copy colors CSS*.
- **New palette or typeset:** copy an existing file in `theme/palettes/` or
  `theme/typesets/` under a new name. It shows up in the dev panel right away.
- **Sizes, spacing, motion:** `theme/base.css`.
- **Layout and components:** `theme/site.css`. It only uses the variables
  above, so colors and fonts never need changing there.

## Screenshots

```bash
npm run shot                                   # desktop + phone → .shots/
npm run shot -- --scheme dark --widths 1440
npm run shot -- --palette ochre --typeset literata
```

## Publish

Pushing to `main` on GitHub runs `.github/workflows/deploy.yml`, which builds the
site and publishes it to GitHub Pages. One-time setup in the repository:
**Settings → Pages → Source: GitHub Actions**.
