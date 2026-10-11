# Design notes

## Brief

Personal portfolio for a PhD candidate in geometric and topological deep
learning. The owner asked for something sophisticated and editorial, closer to
a high-end creative agency than a corporate template: organic, hand-crafted,
with unexpected details. No generic layouts, AI-looking gradients or excessive
symmetry. Audience: hiring committees, collaborators and research recruiters.
The page has to say who he is and what he works on, show the papers, and make
contact and the CV one click away.

## Concept: Cobalt & glaze

The portrait was taken in front of a wall of hand-painted tiles (cobalt, ochre,
tile green). The site is "printed" in a single cobalt ink on porcelain, with
saffron as the only spot color: one ink, one typeface, one figure.

- **Color** (`theme/palettes/cobalt.css`): porcelain `#f3f5f8`, cobalt ink
  `#1a2672` for all text (never black), soft ink `#4d5899`, faint ink
  `#8c94c4`, glaze `#e3e7f3`, saffron `#e7a51c`. Dark mode is night cobalt
  `#0e1434`, not near-black.
- **Type** (`theme/typesets/spectral.css`): Spectral throughout (Production
  Type; the name suits a spectral graph theorist, and the colophon says so).
  ExtraLight for the name and section titles, Regular text, italic for all
  meta (dates, venues, captions, nav). Spectral SC gives true small caps for
  acronyms, per Bringhurst. Oldstyle figures.
- **Layout**: an asymmetric 12-column grid. Section titles hang in a left
  margin (3 columns) and stick while their section scrolls. Dates hang in their
  own column, and a date repeated from the row above is blanked. Whitespace
  separates entries, not rules. Education runs in a narrow column beside
  About. Papers use the full width: the title runs across and a featured
  paper's summary sits beside its authors like a sidenote. The back matter
  (teaching, service, awards) is a denser spread with uneven 3/5/4 columns to
  change pace.

## The one bold thing: Fig. 1

The hero is the owner's real co-authorship graph, computed at build time from
`publications.yaml`: papers are squares, people are circles, and his node is
his portrait, cropped to a circle in a saffron ring. The layout is seeded by
Laplacian eigenvectors (a spectral embedding) and relaxed with a force layout,
and the caption says so in the voice of a paper figure. It is the only
self-starting motion: on load it draws outward from his node hop by hop, the
way messages pass in a GNN. Hover or focus a node to highlight its
neighbourhood; paper nodes link to their entries.

## Quiet details

- The ü in "Cantürk" is drawn as a two-node graph (saffron nodes, ink edge).
  It is also the favicon.
- Pointing at the portrait says where the palette came from.
- Award labels (a paper's Spotlight, a reviewer award) are set in bold
  saffron, the only saffron text.
- Arriving at a paper from a link gives a brief saffron wash.
- The colophon: "Set in Spectral, for obvious reasons."

## Writing

Plain, specific, first person. Sentence case. No eyebrow labels above headings,
no "A · B · C" meta strings, no "→" on links, no single-word italic accents in
headlines.

## Considered and rejected

- Global risograph grain and misregistration: decoration with no job.
- A sticky header: the page is long, but the sticky section titles do that job
  more quietly.
- Separate "Selected" and "All" paper lists: duplication. One chronological
  list where featured papers get a larger title and summary.
- A pure spectral layout for Fig. 1: co-authors with identical papers collapse
  onto one point, so the eigenvectors are only the seed.

## Log

- **2026-10-10**: first build. Cobalt & glaze, Spectral, Fig. 1 hero. Paper
  nodes repel harder (charge 1.8) so the two taxonomy papers separate. Labels
  are de-overlapped at build time and again at runtime. The tooltip picks
  whichever of 8 spots hides the fewest highlighted nodes. Talks with the same
  title are grouped. Alternative palettes (graphite, ochre) and typesets
  (literata, brygada) are available for experiments.
- **2026-10-11**: owner feedback. Dropped the hero statement; the portrait
  moved from About into Fig. 1 as my node (a clear disc in the layout, edges
  start at its rim, labels avoid it). Education sits beside About (`[about,
  education]` pair). Papers widened with summaries as a side column (~25%
  shorter). The Spotlight loop became bold saffron (`--accent-text`, 3.3:1 in
  light mode). Caption widened and rewritten to say what the eigenvectors do
  (they give the starting coordinates). Layout mirrored (`flipX`) so its
  densest corner stays clear of the name. Content updated from the Sep 2026 CV
  (ICML 2026 paper, NAR position paper, Path Laplacian preprint, hybrid
  scattering under review, reviewer awards, end-of-doctorate scholarship).
- **2026-10-11, later**: paper summaries switched off (commented out in
  `publications.yaml`, so each paper is title, authors, venue, links; the side
  column comes back when a summary is uncommented). Reviewer awards in Service
  get the Spotlight treatment via a new `award:` field. Hybrid-scattering paper
  removed until it is public.
- **2026-10-11, later still**: the Contact section is off (it repeated the
  hero); all profile links now sit under the name, and the nav drops Contact.
  `contact` stays available in `site.yaml → sections`.
