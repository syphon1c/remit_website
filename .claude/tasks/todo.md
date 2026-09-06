# remit_website — plan and progress

The public website and online manual for Remit, at `remit-ai.app`. Own repository, own
deploy. Started 2026-09-06.

## What the owner asked for (2026-09-06)

A proper website and supporting online manual. Light only, no dark theme. Promote the
features of Remit AI Coworker and the value: better than hosted agents such as Claude
Cowork; governed in the architecture; completely standalone — your data, your endpoints,
your models — and free; with Remit Cloud for organisations that want the security managed.
No data or prompts collected. Two paid tiers, Team at US$120 a year and Enterprise at
US$600, or completely free.

## Decisions taken, and the assumptions to confirm

- **Stack:** Astro 7 with Starlight 0.42 in one project. Marketing pages are plain Astro
  under `src/pages`; the manual is Starlight under `/docs/`. One design system, one build,
  one deploy. Search is Pagefind, built into the static output — no third-party service.
- **Hosting:** Cloudflare Pages, because the zone, R2 and mail are already there. The
  workflow deploys with `wrangler` on every push to `main`. The owner creates the Pages
  project once and sets two secrets.
- **Domain:** `remit-ai.app` (and `www`) for the site; the manual at `remit-ai.app/docs/`.
  The download page stays where it is, `api.remit-ai.app/download`, and the site links to it.
- **Light only.** Starlight's theme provider is overridden to pin `data-theme="light"` and
  the theme picker is removed. There is no dark palette anywhere in the CSS.
- **No third-party requests.** Fonts are self-hosted from npm (`@fontsource`), no analytics,
  no external scripts or images. The privacy page can then say so truthfully. The
  Cloudflare `_headers` file sets a strict Content-Security-Policy.
- **Pricing semantics — ASSUMED per organisation per year.** Team US$120/year: what the
  code enforces for `team` (50 people, 200 machines, record kept 365 days). Enterprise
  US$600/year: no ceilings (`enterprise` has none in `internal/plan`). Trial 14 days at 5
  people, 10 machines, 30 days. Every protection is identical on every tier and when free:
  that is the owner's ruling in `docs/security.md` and the sentence the pricing page is
  built around. If the prices are per seat, only the pricing page and one FAQ line change.
- **The comparison** is against Claude Cowork by name, on structural, public properties
  only: where it runs, whose models, where prompts go, what governs an action, what is
  auditable, source, price. Nothing about the competitor's internals. A footnote dates it
  and invites corrections.
- **Truthful telemetry sentence.** Standalone Remit sends nothing to us. Signed in to
  Remit Cloud it sends one content-free event when a session starts (which coworker, app
  version, platform, a hashed session id), counted per organisation per day, with an
  opt-out in Settings. The desktop asks `api.remit-ai.app` for the newest version; signed
  in, that request carries the sign-in so the organisation's release channel applies. No
  prompt, message, file, tool argument or reason text is sent to us in any mode — the
  cloud's schema has nowhere to put one (`docs/evidence.md`).

## Design

- **Colour** — the product's own light palette (`surfaces/gui/src/styles.css`), so the site
  and the app are one thing: canvas `#ffffff`, paper `#f5f6f7`, ink `#17191c`, muted
  `#4d535c`, faint `#697079`, line `#e3e5e8`, accent cobalt `#4338ca` with soft `#edecfb`
  and line `#c9c4ef`, ok `#2f7d57`, warn `#92400e`, danger `#b91c1c`. The accent budget
  from `docs/interface.md` applies: the accent means primary action or active state and
  nothing else; failure is danger, attention is warn.
- **Type** — display: Bricolage Grotesque (variable, 700–800, tight tracking) for the
  headlines only; body: IBM Plex Sans 400/500/600 at 17px/1.6 on marketing pages and
  Starlight's 16px in the manual; machine text: IBM Plex Mono. The pairing reads as
  infrastructure with a voice, which is what the product is.
- **Layout** — a 1120px measure, left-aligned hero (no centred stack, no full-viewport
  opener). Each claim sits beside a *real artefact of the product* rendered in HTML: the
  approval card that the outside-content floor raises, an audit row with its chain hash, a
  policy document, the update manifest. Tables carry the comparison and the plans.
  Structure encodes information: the five risk classes are a five-row table because there
  are five; the three ways to run Remit are three columns because there are three.
- **The mark** — `icon.svg` from the runtime, unchanged (the R struck out of the cobalt
  tile), as favicon and in the header at 24px.

## Pages

Marketing (`src/pages`): `/` home · `/product/` · `/security/` · `/cloud/` (Remit Cloud) ·
`/compare/` · `/pricing/` · `/download/` · `/privacy/` · `/404`.

Manual (`/docs/`), synced from the three repositories by `scripts/sync-docs.mjs` and
committed, so the site builds without them and the source of truth stays beside the code:

| Section | Pages (source) |
|---|---|
| Start here | manual landing; getting started (runtime) |
| Remit Coworker | using Remit, configuration, security model, outside content, connectors ▸ Slack, how updates work |
| Remit Cloud | overview (cloud README), organisations, console, policy, evidence, threat model, curating the gallery, sharing, the gallery, authentication, billing |
| Self-hosting | the broker (README), curating a broker gallery (USER_GUIDE), broker auth, broker sharing, deploying Remit Cloud, operating Remit Cloud, key custody |
| Developers | architecture, development, runtime API, cloud API, broker API |

Excluded on purpose: `interface.md`, `releasing.md`, `release-runbook.md`,
`production-readiness.md`, `docs/history/` — internal to the work, not the product.
Relative links between mapped docs become site links; links to other repository files
become GitHub links (the repositories are private today, so those resolve only for us).

## Tasks

- [x] Scaffold: Astro + Starlight (done by `npm create astro`), fonts installed, git initialised.
- [x] `astro.config.mjs`: site URL, Starlight title/logo/sidebar/customCss/components,
      light-only overrides (`ThemeProvider`, `ThemeSelect`), `SiteTitle` linking home.
- [x] `src/styles/tokens.css` (palette, type, spacing), `site.css` (marketing), `docs.css`
      (Starlight variables mapped to the tokens).
- [x] Layout `src/layouts/Site.astro` with header, nav, footer; shared components: Mark,
      ApprovalCard, AuditRow, Section, PlanCard, CompareTable.
- [x] Pages: home, product, security, cloud, compare, pricing, download, privacy, 404.
- [x] `scripts/sync-docs.mjs` + `npm run sync-docs`; run it; manual landing pages per section.
- [x] `public/_headers`, `public/_redirects` (www → apex), `robots.txt`; favicon from the mark.
- [x] `.github/workflows/deploy.yml` (build on PR; build + Pages deploy on main).
- [x] `README.md`: how to run, how to sync docs, how to deploy, what the owner sets up once.
- [x] Verify: `npm run build` clean; every internal link resolves (a link check over `dist`);
      the CSP tried against the built site with a local server that sets the header, search
      included; a look at the home page and one manual page in the browser at desktop and
      phone widths.
- [x] Commit; create the private GitHub repository `syphon1c/remit-website`; push.

## Owner steps, after the push

1. Cloudflare ▸ Workers & Pages ▸ Create ▸ Pages ▸ connect to Git ▸ `syphon1c/remit-website`
   — or `npx wrangler pages project create remit-website --production-branch main` once,
   signed in. Build command `npm run build`, output `dist`.
2. Repository secrets `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`, set
   from your own terminal with `gh secret set`.
3. Custom domains on the Pages project: `remit-ai.app` and `www.remit-ai.app`.
4. Confirm the pricing semantics (per organisation per year is what the page says).

5. Route `hello@remit-ai.app` somewhere you read (Cloudflare Email Routing); the site names it
   as the contact on the footer, the compare page, the pricing page and the privacy page.
6. The Team plan's "Start a 14-day trial" button opens `console.remit-ai.app/console/`, where
   registration is on today. If that should wait for the production identity provider, say so
   and the button becomes "Talk to us".

## Review (2026-09-06)

Built and verified in one day. `npm run check` is green: 40 pages, every internal link and
anchor resolves. Rendered with Playwright at 1280 and 390 wide: no horizontal overflow on any
page, no console errors, the theme light on every page (Starlight's static markup says dark
until its script runs, so the stylesheet maps every theme state to the same light values and
code blocks use one theme), the picker gone. Search (Pagefind, WebAssembly) works under the
production Content-Security-Policy, tried against `scripts/serve.mjs`, which applies
`public/_headers` the way Pages will. Two build warnings fixed on the way: a `/404` route
collision with Starlight's own (now `disable404Route`), and the empty `i18n` collection.

Facts corrected while writing: the connector catalogue has forty-three entries but five are
marked "soon" in the app, so the site says thirty-eight; the trial, plan ceilings and expiry
behaviour are quoted from `internal/plan/plan.go` and `docs/billing.md`; the telemetry
sentence from `internal/cloud/telemetry.go`.

Not done, deliberately: an Open Graph image (needs a rendered card; the meta tags are in
place), a Terms page (the owner's counsel, readiness 0.7), and the deploy itself, which waits
on the Pages project and the repository variable that switches it on.

## Second pass: real captures, cards, logos, live download buttons (2026-09-06)

Owner: "the site is okish", pointing at openworker.com. What that page has and ours did not:
a real product screenshot in the hero, coworker cards with a works-with / checks-in rhythm,
logo chips for models and tools, platform-aware download buttons, and a how-it-works
sequence. Done the same evening:

- [x] Real screenshots of the interface from the runtime's hermetic e2e harness
      (`scripts/shots/`): the Slack approval card in the hero, the reviewer-unsure card, the
      compact write row, Security & trust, Models, Connectors, Coworkers, Inbox, Automations.
      Two captures dropped for mock-data gaps (the access panel's "undefined", a done state).
- [x] Coworker cards generated from the manifests (`scripts/sync-coworkers.mjs`): the three
      that ship, the six in the gallery, and "build your own". `ships: false` built-ins are
      absent from release builds, so they are described, not carded.
- [x] Logo strips: the app's provider marks and simple-icons connector marks, monochrome.
- [x] Platform-aware download buttons that read the cloud's new `GET /download.json`
      (deployed) for the current installers and version; fall back to the download page.
      CSP `connect-src` allows `api.remit-ai.app`; the privacy page says so.
- [x] Home restructured: hero with capture → coworkers → governance with captures → models
      and tools → how it works → starts when work happens → three ways → compare → FAQ →
      download band. Product, security and download pages carry captures too.

## Third pass: the roster, diagrams, and "free, not open source" (2026-09-06)

Owner: the Grok Bot page (x.ai/bot) is the model — graphics carry it; convey "your army of AI
coworkers"; make it clear this is free, self-hosted, not tied to a provider, many coworkers;
more visuals and diagrams. And a correction: **Remit is not open source. It is free**, for
people and for organisations.

- [x] Every "open source", "MIT", GitHub link and repository mention removed from the pages,
      the layout, the Starlight config and the generated manual (sync rules: links to
      repository files dropped, bare mentions rewritten, `development.md` excluded, getting
      started's build section replaced by an install section). FAQ answers "Is it open
      source?" with no, and what is documented instead.
- [x] Home rebuilt in the Grok rhythm, light: centred hero with the roster (nine named
      coworkers reporting back, one conversation open on the real approval wording), then
      tiles with diagrams — where things run, per-coworker models, asks when it must —
      jobs and coworker cards, the ladder diagram with two captures, starts-when-work-happens,
      models and tools, the three ways as columns, "free, really", compare, FAQ, band.
- [x] Diagrams as inline SVG/HTML in the tokens: `DiagramRuns`, `DiagramLadder`,
      `DiagramModels`, `DiagramWays`; reused on product, security and cloud.
- [ ] Owner: the self-hosting pages still describe building the broker and Remit Cloud from
      source (`make build`). With the source unpublished, a self-hoster needs a binary
      download for the broker; the docs will say so once one exists.

## Fourth pass: self-hosted web server, readable captures, Remit Cloud Enterprise (2026-09-06)

Owner: the site will be self-hosted on a web server; the captures are hard to read; make the
Remit Cloud page an enterprise story — a cloud-managed control plane for the fleet of
coworkers: lock down models, controls, MCPs, extra managed security controls — with
mocked-up console pages and diagrams.

- [x] Deploy target is a web server: `deploy/nginx.conf`, `deploy/Caddyfile` (headers, clean
      URLs, caching, www → apex), `deploy/site-deploy.sh` as a forced command, and the
      workflow sends the built site over SSH, switched on by `SITE_DEPLOY_HOST`.
- [x] Captures re-shot at 1180×760 with the sidebar collapsed and the side panel hidden, and
      clipped to the card or the settings content; splits that carry a capture give it the
      wider column; key captures are full-width figures.
- [x] Remit Cloud page rebuilt: console mock-ups (Policy with scope tabs, rule cards and the
      "what a person will see" panel; Fleet; Record; Coworker Gallery with the review queue
      and the update hold), a controls grid of the 23 real policy keys, and a how-it-works
      diagram (policy out, evidence back, the gallery as a supply chain).

## One plan, and a trial page (2026-09-06)

Owner: not two tiers — one, Enterprise, US$200 a year, "manage your fleet of coworkers across
the organisation"; and a page to register for a trial.

- [x] Pricing: Remit Coworker (free) and Remit Cloud Enterprise (US$200 per organisation per
      year, unlimited people and machines, 14-day trial). Every other mention of US$120/600
      and "Team" replaced across home, compare, cloud, download, the three-ways columns.
- [x] `/trial/`: what the trial includes and its ceilings, the four steps (register in the
      console with a verified work address, invite, point machines at it, issue a first
      policy), what happens at the end, what we hold, questions. The register buttons open
      `console.remit-ai.app/console/`. Linked from pricing, the Cloud page, the home page's
      "paid only for governance" and the footer; the nav item is now "Enterprise".
- [ ] Owner: the console signs people in through the development Auth0 tenant until the
      production tenant exists (readiness 0.2); the trial page is live-ready the moment that
      is switched. The cloud's `team` plan remains in code, unsold; remove it in a release
      when convenient.
