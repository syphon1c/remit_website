# remit-website

The public site and manual for Remit, at [remit-ai.app](https://remit-ai.app). One Astro
project: the marketing pages under `src/pages`, the manual under `/docs/` with Starlight.
Light only, by the owner's ruling. No third-party requests: fonts are self-hosted from npm,
there is no analytics, and `public/_headers` sets a Content-Security-Policy that says so.

## Run it

```bash
npm install
npm run dev          # http://localhost:4321
npm run check        # build, then verify every internal link and anchor in dist/
```

## The manual is generated

`src/content/docs/docs/**` is written by `scripts/sync-docs.mjs` from the documentation in
the three product repositories, which it expects beside this one:

```
../ai_openWork         syphon1c/ai_remit             Remit Coworker (runtime, desktop)
../ai_enterprise       syphon1c/remitai-enterprise   Remit Cloud
../ai_remit_broker     syphon1c/ai_remit_broker      the self-hosted broker
```

```bash
npm run sync-docs    # rewrites src/content/docs/docs; commit the result
```

Edit a page in its repository, not here; the next sync overwrites it. The script adds front
matter and a provenance line, turns links between mapped pages into site links and links to
other repository files into GitHub links, and escapes `<placeholder>` tokens outside code so
Markdown does not swallow them. The mapping table at the top of the script is the list of
what is published. Left out on purpose, because the manual is for people using the app,
administrators of an organisation and teams self-hosting the free broker — not for whoever
operates Remit Cloud itself: billing, the cloud's auth modes, its deployment, operations and
key custody, the cloud and broker APIs, the architecture and development pages, the release
runbooks, the readiness list and `docs/interface.md`. The cloud overview and the console page
lose their operator sections at sync time (`TRANSFORM` in the script). The output is committed so the site builds anywhere.

## The captures are real

The screenshots in the manual and on the marketing pages are taken from the actual interface
by the runtime's own screenshot harness (`npm run shots` in `ai_openWork/surfaces/gui`, which
drives the hermetic e2e mocks: a scripted fake agent, no model, no keys, deterministic) into
the runtime's `docs/images/`. `npm run sync-docs` here copies them to `public/docs/images/`
for the manual and converts them to WebP in `src/assets/app/` for the marketing pages. To
refresh a capture, re-run the harness there and sync here; never edit a capture.

`src/data/coworkers.json` (the coworker cards) and `src/data/vendored-marks.json` (the four
brand marks the app vendors by hand) are generated too: `npm run sync-coworkers`, and the
extraction in the git history of `scripts/`.

## Design

Tokens in `src/styles/tokens.css` are the product's own light palette and type roles, so the
site and the app are one thing. The accent (`--accent`, cobalt) means primary action or
active state and nothing else: failure is `--danger`, attention is `--warn`. Display type is
Bricolage Grotesque, body is IBM Plex Sans, machine text is IBM Plex Mono. The marketing
pages show real artefacts of the product (an approval card, audit rows, a policy document)
rather than illustrations of them; keep them truthful when the product changes.

## Deploying to your own web server

The site is static: `npm run build` writes `dist/`, and any web server can serve it.
`deploy/nginx.conf` and `deploy/Caddyfile` are complete server blocks for `remit-ai.app`:
clean URLs, the same security headers `public/_headers` declares, immutable caching for the
hashed assets, `www` redirected to the apex, and the 404 page. Put `dist/` at
`/var/www/remit-ai.app` (a symlink to the current release, see below), reload, done.

`.github/workflows/deploy.yml` builds and link-checks on every push and pull request, and on
`main` sends the built site over SSH to a key that can only run
`deploy/site-deploy.sh`, which unpacks it beside the live directory, checks it, swaps the
symlink atomically and keeps the previous five releases for a rollback. One-time setup on
the server, as root:

```bash
install -m 0755 deploy/site-deploy.sh /usr/local/bin/site-deploy
useradd -r -m -d /var/www -s /bin/sh deploy 2>/dev/null || true
mkdir -p /var/www/remit-ai.app.releases && chown -R deploy:deploy /var/www
# the deploy key: generate it where the private half will live only in GitHub, never on a laptop
ssh-keygen -t ed25519 -N '' -C site-deploy -f site-deploy-key
printf 'command="/usr/local/bin/site-deploy",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding %s\n' "$(cat site-deploy-key.pub)" >> ~deploy/.ssh/authorized_keys
```

Then, from your own terminal: the secret `SITE_DEPLOY_KEY` (the private half) in the
repository's `production` environment, and the variables `SITE_DEPLOY_HOST`,
`SITE_DEPLOY_PORT`, `SITE_DEPLOY_USER` (`deploy`) and `SITE_DEPLOY_HOST_KEY` (the line
`ssh-keyscan -p <port> <host>` prints). Setting `SITE_DEPLOY_HOST` is the switch: until then a
push only builds and link-checks. Delete the local `site-deploy-key` once the secret is set.

To try the built site locally with the production headers applied (the CSP included):
`npm run build && node scripts/serve.mjs`, then open http://localhost:4321. If the site ever
moves to Cloudflare Pages instead, `public/_headers` and `public/_redirects` already say
the same things in that platform's format.

## Facts the copy depends on

- **Remit is free, not open source** (owner, 2026-09-06). No "open source", "MIT" or repository
  links anywhere on the site or in the manual; `scripts/sync-docs.mjs` drops links to repository
  files and rewrites bare repository mentions, leaves out `development.md`, and replaces the
  build-from-source section of getting started with an install section. The FAQ says so plainly.

- **One paid plan** (owner, 2026-09-06): Remit Cloud Enterprise, **US$200 per organisation per
  year**, unlimited people and machines (the cloud's `enterprise` plan has no ceilings). Trial:
  14 days, 5 people, 10 machines, 30 days (`internal/plan/plan.go`). The cloud's `team` plan
  was removed the same day (cloud commit "One paid plan"). The numbers live in `pricing.astro`, `trial.astro`,
  `cloud.astro`, `compare.astro`, `download.astro`, `DiagramWays.astro` and the home page.
- The trial page sends people to `https://console.remit-ai.app/console/` to register; registration
  needs a verified address and makes the registrant owner on a fourteen-day trial
  (cloud `docs/organisations.md`). Sign-in there is through the identity provider Remit Cloud is
  configured with — the development tenant until the production one exists (readiness 0.2).
- Every protection works signed out, offline and unlicensed (owner ruling 2026-09-02).
- The hero roster (`src/components/Fleet.astro`) is an HTML illustration, captioned as such; its
  approval card uses the app's own wording. The diagrams (`src/components/Diagram*.astro`) draw
  the product's real classes, ladder stages and floors; keep them in step with `docs/security.md`.
- Telemetry: signed-in only, one event per session start, opt-out in Settings; signed out
  sends nothing (`internal/cloud/telemetry.go` in the runtime).
- Connector count: the catalogue in the runtime's `docs/connector-catalogue.json` — 43 entries,
  38 `available`; the site says thirty-eight and names the five marked "soon".
- Coworkers: built-ins with `ships: false` are absent from release builds, so the cards show
  the three that ship plus the six in the Remit Cloud gallery (`personas/` in the cloud repo).
- The download buttons read `GET https://api.remit-ai.app/download.json` (cloud commit
  "GET /download.json"); without it, or without script, they open the download page.
- The comparison names Claude Cowork on structural, public properties only, dated September
  2026, with an invitation to correct it.
- **Memory is scoped by who it is about** — you, a project, one coworker, one team — since the
  runtime's C7 (2026-09-09, `internal/memory/memory.go`). The product page says so; "per person
  and per project" was true of the first three scopes only.
- **macOS builds are signed and notarized** from 0.4.1 (2026-09-11): a Developer ID
  Application certificate and notarization in CI, so Gatekeeper passes a downloaded copy
  with no "Open Anyway" and the ticket is stapled for a first launch offline. The download
  page says so; it previously carried the caveat. **Windows is still unsigned** and
  SmartScreen still warns, so that caveat stays until an Authenticode certificate exists.
  The macOS card also names the one prompt that remains, local network access, because a
  coworker reaching Ollama on the LAN is the common case and a denial looks like an
  unreachable host rather than a permission.
- **Nothing internal reaches a public page.** Remit is closed source, so a package path, a
  source or test file, a build or test command, a commit to revert or an internal planning
  artefact is both a disclosure and an instruction the reader cannot follow.
  `scripts/sync-docs.mjs` cuts the sections written for people with the repository, rewrites
  the scattered references into words, and then REFUSES to write a page that still carries
  one — the sync fails rather than publishes, because a leak that lands is already indexed.
  Add a section like that to a product doc and the next sync tells you which page and line.
- **Nothing invites a source build.** The download call to action names the three platforms and
  stops there: the manual's getting started has an install section and no build section, and a
  page telling somebody to build what the site will not help them get is the "free, not open
  source" decision contradicting itself (fixed 2026-09-09).
