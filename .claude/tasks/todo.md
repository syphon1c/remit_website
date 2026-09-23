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
- [x] Commit; create the private GitHub repository `syphon1c/remit_website`; push.

## Owner steps, after the push

1. Cloudflare ▸ Workers & Pages ▸ Create ▸ Pages ▸ connect to Git ▸ `syphon1c/remit_website`
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
      is switched. The cloud's `team` plan was removed the same evening (cloud commit "One paid
      plan") and deployed.

## No backend documentation in the public manual (2026-09-06)

Owner: billing — how plans are set and approved — and the like are not for public
consumption. Removed from the mapping: billing, the cloud's auth modes, gallery deployment,
Remit Cloud deployment, operations and key custody, the cloud and broker APIs, and the
runtime architecture page. The cloud overview keeps the three ways to run Remit and a list
of the administrator pages; the console page drops its "turning it on" section; the updates
page keeps the reader's half. The manual is now 21 pages for three readers: people using
the app, administrators, and teams self-hosting the broker. Site links that pointed at the
removed pages now point at the broker guide or at hello@.

## The manual catches up, and two claims that had gone false (2026-09-09)

Owner: "is there anything that should update there or features. Specifically aswell there is
a manual section, can you analyse and see what needs to be updated."

**The manual was four tiers behind.** `npm run sync-docs` brought ten pages forward, +547
lines: Slack's "Replies without asking", standing allowances and the teaching card, model
tiers and the reviewer separation, approval expiry, the browser driver, session grants,
the automation's model pin and its one bounded retry, board chain verification, memory's
persona and team scopes with `memory_search` and the journal bridge, typed deliverables and
the digest, and the Cloud's policy keys, heartbeat fields and evidence kinds. `npm run check`
builds and every link in 31 pages resolves. Nothing here was authored: the pages are
generated, and every one of those features was written in its own repository as it shipped —
which is why the sync was a mechanical catch-up rather than a rewrite.

**Two claims on the product page had become false, and one contradicted a decision.**
- [x] "Memory … scoped per person and per project" — true of three scopes, and there are now
      four: you, a project, one coworker, one team.
- [x] "Download the app, or build it from source with Go 1.25." The site's own rule is *free,
      not open source*, and it is enforced everywhere else — the sync drops repository links,
      leaves out `development.md`, and replaces getting started's build section with an
      install section. A call to action inviting a source build is the decision contradicting
      itself on the page most people read. It names the three platforms now.
- [x] Both recorded in `README.md` ▸ Facts the copy depends on, with what made them wrong.

**Two capabilities earned a line.** The approvals section said "unless you make it a standing
rule" without ever saying what one is; it now says — one tool, one exact target, taught from
the card, listed and revocable. The automations section now says what a run delivers, that a
runtime failure is retried once, and that one call returns everything since a time you name.

Checked and left alone: the connector counts (43 in the catalogue, 38 available, the five
"soon" named), the security page's five floors — its line on authority outliving the session
already anticipated standing rules and reads correctly beside them — and the pricing, trial
and download numbers, none of which moved.

## The manual stops carrying the source (2026-09-09)

Owner: "As Remit is closed source, make sure the website manual is not giving/exposing
internal development code etc." It was. Twenty-one references across eight pages, and
three whole sections written for somebody holding the repository.

**What was public.** The broker page carried its entire package layout — nine directories
with what each contains — plus its make targets and its dependency argument, and its quick
start opened with `make build`. The outside-content page told a reader to run
`go test ./internal/engine/ …`, named a test file, and gave two ways to back the floor out
as `git revert <sha>` against four internal commits, with advice on which tests to keep
after the revert. Its "if you want it stricter" section described two one-line edits to a
named source file and function. Scattered around: `internal/hashchain`, `internal/signer`,
`internal/policy` with its field names, `internal/events`, `internal/auth.Authenticator`
with its methods, a pointer to `.claude/tasks/specs/policy.md`, and a `grep` over
`internal/server/*.go` offered as the authoritative route list.

**Fixed at the source of the manual, not in its output.** The pages are generated, so a
hand-edit would have lasted until the next sync. `scripts/sync-docs.mjs` now cuts those
sections for the public copy the way it already cut the cloud's operator material, rewrites
each scattered reference into the sentence it was standing in for — the same fact, in words
— and starts the broker's quick start from the binary a reader actually has. The four
"back it out" recipes become one honest paragraph: there is no switch, separating recording
from enforcement or removing the floor is a change to the product, ask us.

**And it cannot come back.** `assertNoInternals` runs on every page immediately before it is
written: a package path, a source or test file, a Go toolchain command, a `git revert`, a
build target or an internal planning artefact fails the sync with the page, the line and the
text. Verified by putting one back — it named `cmd/r` on line 242 and refused. The rule is
deliberately not "every `*.go`": the guide quotes a bad prompt about the reader's *own*
`auth.go`, and a guard that cannot tell their file from ours would have pushed a good
sentence out of the manual.

One consequence worth naming: the provenance line under every page used to say the text is
the same one the people building Remit read. That stopped being true the moment the manual
started leaving things out, so it now says material written for them is left out.

Checked and clean afterwards: no internal paths, no commit hashes (the one that remains is a
truncated `sha256:` in an example CLI output), no internal identifiers, and `dist/`,
`.astro/` and `node_modules/` are ignored rather than published. 31 pages build, all links
resolve.

## macOS is signed, so the copy that said otherwise is gone (2026-09-11)

Remit 0.4.1 shipped signed with an Apple Developer ID and notarized, and the site still
told people Gatekeeper would refuse it.

- [x] `src/pages/download.astro`: the macOS caveat becomes a statement — it just opens, the
      ticket is stapled, nothing to click past. The heading above the cards said "Two things
      to know", which was a count of caveats and is now one, so it reads "What to expect".
- [x] The same card names the one prompt that remains: local network access, the first time
      a coworker reaches a model on your own network. That is worth saying here rather than
      leaving it to be discovered, because a denial presents as an unreachable host and
      reads like a broken network.
- [x] Four cards, not five: the network note folded into the macOS card rather than standing
      alone and leaving a ragged last row in a two-column grid.
- [x] `npm run sync-docs` carried the corrections the runtime made to its own docs —
      getting started, how updates work, releasing — into the manual. The "Not yet" entry
      for Apple notarization is gone; Windows code signing is still there, because it is.
- [x] Recorded in README ▸ Facts the copy depends on, including that Windows is untouched.

Checked: no page in the manual or the site still says "not notarized" or "Open Anyway".
31 pages build, all links resolve.

## Coworkers that pick up each other's work (2026-09-16)

Owner: the runtime's `grapevine` branch merged — a coworker publishes a finished piece of
work, and coworkers set to listen hear about it and act on what is useful. Call the
capability out on the site without naming it; the manual carries the Grapevine in full.

- [x] Runtime: two real captures from the screenshot harness — the screen (everything
      published and what came of each post) and the hand-over card (*Hand over report.md from
      Grapevine #12*) — so the site shows the product, not a mock-up; `docs/grapevine.md`
      embeds the screen.
- [x] `scripts/sync-docs.mjs`: map `docs/grapevine.md` → *The Grapevine*; map the examples
      walkthrough → *Trying the Grapevine*, with the three manifests inlined from the
      example files at sync time, because a reader has no repository to import them from.
      Sidebar and manual landing updated.
- [x] Home: a section after the coworkers — one coworker's result is another's start — with
      the screen capture and the three rules (you hand the work over; a post is information,
      not an instruction; a chain ends). FAQ "what can a coworker never do" gains the line.
- [x] Product: a split under "everything else" with the hand-over card; the section heading
      and the page description name the capability.
- [x] Security: the sixth floor — another coworker's work crosses only through you — and the
      outside-content floor's one-hop-further sentence.
- [x] README ▸ facts: the numbers the copy depends on, and the naming decision.
- [x] `npm run sync-docs && npm run check`; the new pages and sections looked at in the browser.
      (Closed 2026-09-23 with the teams pass below, which ran both over this tree.)

Done the same morning. The captures are real: the harness gained two steps and was re-run,
which also refreshed twenty existing captures the interface had moved on from (the account
menu now shows the Grapevine row it describes). The home section sits after the coworkers,
so every section below it swapped shade to keep the alternation; the sixth floor card fills
the security page's grid, which five had left ragged. The walkthrough's install step named a
control the Coworkers tab does not have (*Import*); fixed at the source. The product page's
description said forty-three connectors where the page says thirty-eight; fixed in passing.
33 pages build, all links and anchors resolve, no console errors, no horizontal overflow at
phone width.

## Teams ship, secrets stay out of the record, and the manual shows how (2026-09-23)

Owner: the runtime's C6 work shipped the DevSecOps and SWE teams, retired Ops, added a Deps
Worker, reworked the picker, and made the board and journal refuse a secret's value
(runtime `3c4a539`, `3cb6063`). "Important features to add to the website and the manual:
highlight them, and how to in the manual."

State found first. The 2026-09-16 Grapevine pass is complete in the tree but was never
committed. A sync run on 2026-09-23 stopped at the runtime's `docs/api.md` line 163 (a
package path added after the rules were written), having cleared the generated pages it had
not yet rewritten. So the cloud, self-hosting and API pages read as deleted. They regenerate
once the sync runs through.

- [x] Runtime source: `api.md` line 163 in words; a new `docs/teams.md`, the how-to (the two
      teams, running one step by step, the two cards, the board, while you are away, what the
      workers are, secrets, scanners, models); `using-remit.md` points to it.
- [x] Runtime captures: the harness serves a release build's coworker list and the Security
      coworker's real detail, since the e2e fixture still has a retired coworker and one
      generic detail. The picker step learns the short row names, and a `board` capture is
      added (the mocks' security engagement, the blocked item open). All 23 steps ran.
- [x] `sync-docs.mjs` maps `docs/teams.md` → *Coworker teams*; sidebar and manual landing
      (six cards, the Grapevine given one so the grid is not ragged).
- [x] `sync-coworkers` carries `team`. The cards show the three specialists, then "And two
      teams" with each lead's card naming the workers it staffs.
- [x] Home: the coworkers section names the teams, and two job pills. Product: "A team for the
      whole job" with the board capture, and the gallery text in its own split; the board card
      says it refuses a secret's value. Security: the Secrets card. Compare: fourteen built in.
- [x] README ▸ facts: the counts, the teams, the secret rule, each with its source.
- [x] `npm run sync-docs && npm run check`; the changed pages looked at in the browser.

**Review.** Nothing is committed in either repository; the owner decides. The manual now syncs
again: 23 pages, the cloud and self-hosting pages back, and the Grapevine pages and captures
from 2026-09-16 carried along. 34 pages build and every link and anchor resolves. In the
browser at 1280 wide: the Product page's specialist row, the two team cards, and the teams
split beside the board capture; the manual's teams page with its contents; the landing's six
cards even. At 375 wide, Home, Product and the teams page have no horizontal overflow. No
console errors.

The captures were refreshed wholesale, because the interface had moved on since 09-16. Two
of them were checked against the code rather than trusted. The picker and Settings now show
the release set: no Ops, workers in their own section. The Security detail lists the
manifest's three models instead of the fixture's Opus 4.8. The board capture uses the blocked
item: the item in review carries the attachment test's solid placeholder image, which reads
as a fault, and hiding it would be editing a capture.

The manual's teams page states the leads' and workers' doctrine (re-checking, the Coverage
note) as what they are instructed to do, and the cards and the Inbox as what the code does.
The FAQ's "what can a coworker never do" was left alone: the secret check works by shape, so
"never" would overclaim.

**Then (owner, same day): the Grapevine needs no feature spot now that teams ship; keep it in
the manual.** Home loses its "one coworker's result is the next one's start" section, and the
seven sections under it get their shading back as it was before 2026-09-16. The FAQ answer on
how many coworkers you can run is back to its earlier wording. Product loses the hand-off split,
"hand-offs between coworkers" in the everything-else heading, and the phrase in its
description. The manual keeps both Grapevine pages and gains a landing card. The protections
stay listed, because they hold whether or not anyone uses the feature: the Security page's
sixth floor, the outside-content sentence about published results, and the FAQ's "read
another coworker's work without you handing it over". README ▸ facts records the ruling. 34
pages build, every link resolves, and the shading alternates from top to bottom.
