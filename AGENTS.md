# CLAUDE.md

The public website and manual for Remit (`remit-ai.app`). Astro 7 + Starlight; the marketing
pages in `src/pages`, the manual generated into `src/content/docs/docs` by
`scripts/sync-docs.mjs` from the three product repositories checked out beside this one.

Rules that are decisions, not defaults:

- **Light only.** No dark palette, no theme picker. `src/components/starlight/ThemeProvider.astro`
  pins the theme; `tokens.css` has one set of values.
- **No third-party requests.** Self-hosted fonts, no analytics, no external scripts or images.
  `public/_headers` enforces it with a CSP; if a change needs a new origin, the privacy page
  is wrong until it is updated too.
- **Free, not open source.** Never write "open source", "MIT" or link to a repository. The manual
  sync enforces it for generated pages; the pages in `src/pages` are yours to keep honest.
- **The copy must be true to the code.** Counts, limits, prices and behaviours are cited in
  `README.md` ▸ "Facts the copy depends on" with the file they come from. Check the source
  before changing a number.
- **Manual pages are generated.** Edit them in their repository and run `npm run sync-docs`.
- **The accent budget** from the runtime's `docs/interface.md`: cobalt means primary action or
  active state and nothing else.

`npm run check` builds and verifies every internal link and anchor. Plan and progress live in
`.claude/tasks/todo.md`.
