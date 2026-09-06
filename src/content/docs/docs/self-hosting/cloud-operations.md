---
title: "Operating Remit Cloud"
description: "What an operator runs, sets and keeps. The gallery's own deployment walkthrough is in gallery-deployment.md; this page is everything that arrived after it."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

What an operator runs, sets and keeps. The gallery's own deployment walkthrough is in
[gallery-deployment.md](/docs/cloud/gallery/); this page is everything that arrived after it.

- [The database](#the-database)
- [Signing keys](#signing-keys)
- [Publishing a desktop release](#publishing-a-desktop-release)
- [Telemetry](#telemetry)
- [Environment twins](#environment-twins)

## The database

Postgres, one engine. Set it with `database_url` in the config or `DATABASE_URL` in the
environment; the config wins when both are set.

```toml
database_url = "postgres://remit:…@db.internal:5432/remit_cloud?sslmode=require"

[org]
slug = "acme"      # the tenant this deployment serves; created at startup if absent
name = "Acme"
```

**Without a database the server is the gallery and nothing else.** The routes that need
durable state — telemetry, releases, and everything that comes after — are *not mounted*
rather than mounted and failing, so a runtime pointed at a database-less deployment sees a
404 it treats as "not offered", not an error it logs every thirty minutes.

Migrations are embedded in the binary and applied at startup, one per transaction, under an
advisory lock; two instances starting together cannot interleave. There is no separate
migrate step and nothing to run by hand. A database that cannot be reached, or cannot be
brought to the current schema, stops the server: serving against the wrong schema is worse
than not serving.

For development, `compose.yaml` runs Postgres 17 on loopback with its data on tmpfs, and
`make check` brings it up. The `internal/store` tests skip — loudly — when `DATABASE_URL` is
unset, so a run without Docker is still a real run of everything else.

### What lives in it

With `database_url` set, the gallery's own record moves into the store: the hash-chained
journal (`gallery_journal`, one row per entry, the same hashes the JSONL file would carry),
the install counts (`gallery_install`, counts only), and the directory of who has signed in
(`person`). Two instances over one database share all three; a second writer that has
gone stale is refused by the journal rather than allowed to fork the chain. The upload
queue and the published coworkers stay on disk under `[gallery]`. Without a database,
everything is the file and the memory it was.


**Backups** run nightly from `remit-cloud-backup.timer` (`deploy/README.md` ▸ Backups): a
dump is restored into `remit_restore` and verified before it is kept, sealed to the
deployment's age key, and shipped to a private bucket when one is configured. The
private key must exist somewhere other than the machine — the password manager — or the
dumps die with it. `remit-cloud-restore <dump.age>` rehearses a restore into the scratch
database; `--into remit --live` is the real thing, and it starts the service only if the
restored database verifies.

## Signing keys

Three surfaces are signed: desktop updates, policy documents (Phase 2), and published
coworkers (Phase 4). Whoever holds a private half can push code, rules or instructions to
every installation, which is why generation is deliberately small and dull.

```sh
remit-cloud keys generate            # mints updates, policy, coworkers
remit-cloud keys show updates        # prints the form tauri.conf.json's `pubkey` takes
```

Keys land in `$XDG_CONFIG_HOME/remit-cloud/keys/`, else `~/.config/remit-cloud/keys/` —
`--dir` overrides — as `<name>.key` (0600) and `<name>.pub`. **`generate` refuses to
overwrite.** Rotation is `rm` and `generate` on purpose: a `--force` flag is how a key gets
replaced by accident. `.gitignore` refuses `*.key` regardless; do not fight it.

The public-key and signature formats are minisign's, byte for byte, because the runtime's
updater consumes them (`tauri-plugin-updater` verifies against the pubkey compiled into its
config). The secret-key file is remit-cloud's own documented envelope, unencrypted:

> **These are development keys.** A proper release rotates to keys held under real custody —
> HSM, KMS or offline — and replaces every public half that was published. That rotation is
> a release blocker (plan decision 6), not a footnote.

## Deploying this server

Since 2026-09-05 the server at `api.remit-ai.app` deploys from GitHub, and the owner treats
that box as production for pre-production testing. The runbook's one-time setup is done
there: the forced-command script is installed, the restricted deploy key is in root's
`authorized_keys`, and the repository's `production` environment holds the key and the
host's pinned fingerprint. The first run from GitHub, 33953436269, built, gated, deployed
and health-checked end to end.

**What starts a deploy** is a `v*` tag on this repository, or a person running it:

```sh
gh workflow run deploy.yml -R syphon1c/remitai-enterprise
```

Nothing else does. A push to `main` deploys nothing, and that is the human step: GitHub's
required-reviewer rule on environments is an Enterprise feature for private repositories,
so the environment scopes the deploy key and does not gate it. Who may push a tag or
dispatch the workflow is the gate.

**What the run does.** Lint and the full test suite against a Postgres service — the same
gate as `make check` on a laptop, and the first run failed for the lack of it, which was the
gate working. Then `make dist`, and the binary and its checksum are sent over SSH as one
tarball on standard input to a key whose only permitted command is
`deploy/remit-cloud-deploy.sh`. On the box: checksum verified before anything is touched,
the running binary kept as `remit-cloud.prev`, service stopped and started with the socket
unit holding 443 throughout, twenty seconds to become healthy, and a rollback to `.prev`
with the last twenty log lines if it does not. The workflow then checks health and
discovery from outside. The version discovery reports is the tag, or the commit hash for a
run by hand.

**By hand, in an emergency**, the same script runs from any machine holding the key:

```sh
make dist && tar -C dist -czf upload.tgz remit-cloud-linux-amd64 remit-cloud-linux-amd64.sha256
ssh -i deploy-key -p 65221 root@104.237.150.172 < upload.tgz
```

and the original copy-and-install steps in `deploy/README.md` still work without the key.

## Outbound mail

Invitations and self-asserted sign-in codes go out through `[smtp]`. Without it nothing
breaks — an invitation is the row, not the message, and the console says nobody was
emailed and shows the join link to pass along — but an administrator inviting fifty people
should not be forwarding links by hand.

The production choice is **Cloudflare Email Service** (decision 2026-09-06): the zone is
already on Cloudflare, it writes the authentication records itself, and 3,000 messages a
month are included with the Workers Paid plan. Setting it up is three steps:

1. Cloudflare dashboard ▸ **Compute ▸ Email Service ▸ Email Sending ▸ Onboard Domain**,
   choose `remit-ai.app`. It creates the bounce MX records and SPF on `cf-bounce`, DKIM
   on `cf-bounce._domainkey`, and DMARC on `_dmarc` (default `p=reject`). Wait until the
   records show *Locked* or *Unlocked* under Email Sending ▸ Settings.
2. **My Profile ▸ API Tokens ▸ Create Token**, custom, with the single permission
   **Email Sending: Edit** on this account. The token is the SMTP password.
3. On the box, `[smtp]` in `/etc/remit-cloud/remit-cloud.toml`:

   ```toml
   [smtp]
   host     = "smtp.mx.cloudflare.net"
   port     = 465
   from     = "no-reply@remit-ai.app"
   username = "api_token"
   ```

   and the token as `REMIT_CLOUD_SMTP_PASSWORD=…` in `/etc/remit-cloud/env`, then
   `systemctl restart remit-cloud`. The startup log's "verification codes will be written
   to this log" warning disappears.

Every mail goes out as two parts saying the same thing — plain text, and an HTML layout
with the mark, the wordmark and the card — so a text-only reader and a mail client each
get what they can show. Neither part carries a link or an image, by design: a sign-in
mail that loads remote content or offers something to click teaches the habit the whole
product resists, and the layout renders identically with images blocked. The join link
in an invitation is shown to be copied; the deployment is named in the footer as text.

Port 465 is TLS from the first byte (SMTPS) and the mailer treats it so without being
told; 587 is a plain connection upgraded with STARTTLS. Cloudflare offers only 465. A
client that dials 465 expecting STARTTLS gets no error, only a greeting that never comes —
the mailer has a twenty-second dial timeout for that reason and a test that fakes an
SMTPS server. Cloudflare's answers worth knowing: `535 5.7.8` is a bad token, `550 5.7.1`
is a From domain that is not onboarded, and 50 recipients per message is the ceiling.

Prove it before anyone depends on it, from the box, by the same path an invitation takes:

```sh
set -a; . /etc/remit-cloud/env; set +a
remit-cloud mail test --config /etc/remit-cloud/remit-cloud.toml --to you@example.com
```

Then a real invitation to an outside address from the console; the reply says
`notified: true` and the mail should pass DMARC (check the headers).

## The download page

`GET /download` on the API host is the page people install from, rendered on request from
the newest public release: installers grouped by platform with sizes and SHA-256 checksums,
the release notes, and the note about first installs on macOS until there is a Developer
ID. It changes the moment a promote lands; nothing is generated or uploaded for it. The
pipeline's `collect` verb records every installer with its checksum, and `upload` writes a
`SHA256SUMS` beside the files for anyone verifying by hand.

A hostname that *is* the page: set `[downloads] host = "download.remit-ai.app"` and add a
proxied DNS record for that name pointing at the same origin (a CNAME to `api.remit-ai.app`
in the zone). The server answers `/` on that host with the page and keeps the API's root a
404 on every other host. The R2 bucket behind `downloads.remit-ai.app` serves the files by
exact path only — a bucket has no front page, which is why the server renders one.

`GET /download.json` is the same release as data: version, publish date, notes, and the
installers per platform with size and SHA-256, in the order the page shows them. It is
public, cached for five minutes and readable from any origin, because it says nothing a
browser could not read off the page. The website's download buttons use it, so "Download
for macOS" points at the current installer without the site being rebuilt for a release.


## Publishing a desktop release

Releases are built, signed, uploaded and published by the runtime repository's pipeline
(`../ai_openWork/.github/workflows/release.yml`, described in its `docs/releasing.md`): a
tag builds every platform, signs the updater artifact with the key held in a protected
GitHub environment, uploads to the downloads bucket on immutable paths, publishes to the
canary organisation's channel, verifies, and — behind a person's approval — publishes to
the public channel and verifies again.

Its door into this server is `POST /v1/releases`, mounted only when `[release]
publish_token` is set — an opt-in write path, like every other one here — and taking
exactly what the console command takes: version, notes, per-target URL and signature, an
optional `org` slug for a canary, and an `actor` the journal records as `ci:<run>`. The
signature is parsed at publish time, so one the updater could not read is refused once,
not discovered at every poll. Nothing is signed here.

The runtime polls `GET /desktop/latest.json` fifteen seconds after boot and every thirty
minutes. **204** means up to date; **200** carries the static manifest — version, notes,
RFC3339 `pub_date`, and a `platforms` map of url + signature per target. The manifest is
`Cache-Control: no-store`, because the entire point of the poll is to see the newest one.

**The poll may carry a bearer.** The desktop sends its cloud session when it is signed in
to the origin that serves the manifest, and that is what selects an organisation's channel
and honours its **Hold updates**: without it — an anonymous poll, which is what a fresh
install and the self-hosted broker's users send — the answer is the public channel. A
bearer this server cannot verify is simply anonymous, never an error: an updater that
needed a valid session could not deliver the release that fixes sign-in.

By hand, from the box, the CLI still works and is the fallback:

```sh
cd ../ai_openWork/surfaces/gui
npx tauri signer sign -f <the updates key> -p "" \
    src-tauri/target/release/bundle/macos/RemitAI.app.tar.gz
remit-cloud release add --config remit-cloud.toml \
    --version 0.2.2 --notes "…" \
    --asset darwin-aarch64=https://downloads.remit-ai.app/0.2.2/darwin-aarch64/RemitAI.app.tar.gz=./RemitAI.app.tar.gz.sig
```

`<target>` is the updater's own key, `<os>-<arch>`; the **last** `=` separates the signature
file, so a URL may contain `=`. Omit `--org` for the public channel; `--org <slug>`
publishes to one tenant's channel, which the updater is served ahead of the public one.

And to check a channel the way an endpoint would — download every asset, verify every
signature against the pubkey compiled into the desktop:

```sh
remit-cloud release verify --url https://api.remit-ai.app/desktop/latest.json \
    --pubkey <the pubkey from tauri.conf.json, or a key file>
```

## Telemetry

`POST /v1/telemetry/events` accepts the one event the runtime sends when a session starts:
which coworker, which family, which app version and platform, and a session id that arrives
already hashed. The decoder refuses any field beyond that shape, so a chattier runtime is
refused rather than recorded.

What is kept is a **count** per (org, day, coworker, family, app version, platform). Not the
install id, not the session hash, not a person. "Which coworkers get used" is a question
about coworkers; "who used this one" is a question about people, and the table has no column
that could answer it.

## Managed connectors

A managed connector is the one-click path: a person clicks Connect in the runtime, consents
in the browser through the *company's* OAuth app, and the tokens land on their own machine.
This server holds the app's credentials and a row saying who connected what; it never
stores a connector token — the `connection` table has no column that could hold one, and a
test asserts that. A token passes through the OAuth callback once, in a form the browser
submits to the desktop's loopback, and that loopback is the only destination the start
route will accept.

### GitHub, as a GitHub App

1. Register a GitHub App (organisation settings → Developer settings → GitHub Apps).
   Callback URL: `<public_url>/v1/oauth/github/callback`. Permissions as the coworkers
   need; subscribe to the events the relay should carry. Generate a private key and keep
   the `.pem` where only this service reads it.
2. Configure it:

   ```toml
   [oauth.github]
   app_id = 123456
   app_slug = "remit-acme"          # github.com/apps/<slug>
   client_id = "Iv1…"               # optional: attributes an install to the person who linked it
   client_secret = "…"
   private_key_path = "/etc/remit-cloud/github-app.pem"
   ```

   All three of `app_id`, `app_slug` and `private_key_path` or none: a partial section is
   a startup error, never a consent screen that cannot be finished. The key is read once
   at startup and used only to sign ten-minute App JWTs.
3. In the runtime, the GitHub connector's Connect button now installs the App; the
   installation id comes back as routing metadata, and `POST /v1/github/token` mints
   short-lived installation tokens for it on demand — only for a person whose connection
   lists that installation.

### Slack, as an app

1. Create a Slack app. OAuth & Permissions → redirect URL `<public_url>/v1/oauth/slack/callback`;
   bot scopes as the runtime's Slack connector documents (the default install asks for
   `app_mentions:read`, `channels:history`, `chat:write`, `users:read`, `channels:read`).
   Event Subscriptions → request URL `<public_url>/v1/relay/slack/events`, subscribe to the
   bot events that match the scopes (`app_mention`, `message.channels`, …) plus
   `app_uninstalled` and `tokens_revoked`. Interactivity → request URL
   `<public_url>/v1/relay/slack/interactivity`.
2. Configure it:

   ```toml
   [oauth.slack]
   client_id = "…"
   client_secret = "…"
   signing_secret = "…"
   ```

   All three or none. The signing secret is what admits an event; without it the ingest
   routes are not mounted.
3. Connect in the runtime installs the app on a workspace; the bot token goes to that
   desktop and the workspace's events are routed to it.

Other providers arrive one at a time; each is a `[oauth.<provider>]` section and nothing
else changes.

## The relay

The runtime keeps one WebSocket open to `cloud_relay_ws_url`, authenticated with its
session bearer, and receives platform events down it — replies go from the desktop straight
to the platform with the token the desktop holds. Point the runtime at
`wss://<public_url host>/v1/relay/ws`. A connect adds a route (this identity receives this
installation's or workspace's events); a disconnect or the runtime's own uninstall call
drops it.

Inbound events arrive by webhook — Slack's Events API and Interactivity, the GitHub App's
webhooks — and every one is signature-verified before it is parsed. A verified event is
pushed to every desktop routed for its workspace or installation, tagged with a
`provenance` object (`source`, `signature: verified`, `authored_by: outside`,
`received_at`) that says exactly what it is: content authored outside the company by a
webhook, not by a person at a keyboard. A desktop that is offline gets a COUNT per channel
recorded, never the event, and is told on its next connect as a `missed` frame — once.
An uninstall on the platform's side drops the routes and tells each desktop `revoked`.
GitHub routes only what names the coworker: `@<mention>` in a comment, issue or pull
request, or a label of that name; the rest of the App's subscription is acknowledged and
dropped.

## The gallery as a supply chain

A coworker is instructions, skills and connector grants, and a company gallery pushes one to
every machine that installs it. Three controls:

- **Signing.** With a coworkers key (`remit-cloud keys generate coworkers`; `[gallery]
  signing_key_path` or the default key directory) the registry signs every manifest and
  archive it serves — ed25519 over the exact bytes, the hash in the trusted comment — and
  the routes carry `manifest_signature` / `bundle_signature`. A runtime pins the public
  half (`cloud_gallery_pubkey`; the dev key is compiled in) and refuses a signature that
  does not verify; an unsigned coworker installs as before unless the org policy sets
  `personas.require_signature`.
- **Scanning at publish time.** Every upload is read for instruction shapes that address
  the model rather than the task, exfiltration shapes, hidden characters and markup, and
  connector or tool grants the manifest never recommended. Findings, with the line they
  came from, are on the queue (`scan` counts), the review (`scan.findings`) and
  `remit-cloud gallery show`. A scan is a reviewer's aid: it never approves or refuses, and
  a clean one proves nothing. Read the skills.
- **Revocation.** Put a slug in the org policy's `personas.revoked` and it is hidden from
  the list and refused with 410 on every install route here, and disabled on every runtime
  at its next policy fetch, where a person cannot re-enable it while it stays withdrawn.

## Policy

Policy documents are constraints an organisation places on its runtimes: allowlists
narrowed, modes forbidden, budgets capped, knobs locked. They compose by intersection with
each machine's own settings and can only tighten — the lattice that defines "tighter" for
every key is `docs/policy.md`, and the runtime enforces it; this server validates, signs and
serves.

- Issue with `PUT /v1/admin/policy` (the org) or `/v1/admin/policy/groups/<group>` (one IdP
  group) as an operator. The body is a draft: `keys`, an optional `on_stale` overlay that may
  only tighten further, and optional `max_age` (default 7 days) and `refresh_after` (default
  15 minutes). A draft with a key the lattice does not know is refused whole and the key is
  named.
- Documents are signed with the org's policy key (`remit-cloud keys generate policy`;
  `[policy] signing_key_path` or `REMIT_CLOUD_POLICY_SIGNING_KEY_PATH` to point elsewhere).
  Without the key, documents can be read but not issued. Runtimes pin the public half.
- Every issue goes on the policy chain, a hash-chained record like the gallery's;
  `GET /v1/admin/policy/versions` reports `chain_intact`.

## Evidence

A runtime whose policy document carries `"evidence": {"events": true, "anchors": true}` sends
back two content-free things: the *kind* of governed thing that happened (a policy denial,
an approval and its outcome, a reviewer verdict, a mode change: the risk class, the policy
key, a tool's name, a session's hash, the time; never an argument, a reason text or a
message), and the heads of its hash chains, from which a rewritten or rewound local journal
is detectable here as a `chain_fork`. The schema has no column that could hold content and
the decoder refuses any field it does not know.

Operators read it at `/v1/admin/evidence/{events,summary,anchors}`. The summary is the
approval analytics: where policy is too tight to live with shows up as denials and `unsure`
piling up in one risk class or one group. Retention is per org (`retention_days`, default
365) and legal hold suspends the daily sweep; both are set at `/v1/admin/evidence/retention`
and journalled.

### Export

Set one or more sinks under `[export.*]` and every minute the server feeds each what it has
not seen, advancing that sink's cursor only after the sink said yes — so a restart resumes
and an outage replays nothing and skips nothing. Splunk takes newline JSON at its HTTP
Event Collector with the event's own time; Sentinel takes the Logs Ingestion API (a data
collection endpoint and rule, a client-credentials token from Entra ID); S3 takes one JSONL
object per batch under `prefix/YYYY/MM/DD/`, signed with SigV4 written here, on AWS or any
S3-compatible endpoint. `GET /v1/admin/evidence/export` shows each sink's cursor and last
error. The rows are the same content-free shape the admin routes serve.

## Running a fleet

**Heartbeat.** A policy document with `"fleet": {"heartbeat": true, "interval": 900}` has
every runtime report, on that cadence, its device id, build, OS, the policy ids it holds,
the coworkers it has installed (ids, slugs, hashes) and the connectors it has connected —
never content. `GET /v1/admin/fleet` is the inventory with one compliance question answered
per device: does it hold the policy it should. `/summary` counts.

**SCIM.** Set `[scim] token` (twin `REMIT_CLOUD_SCIM_TOKEN`) and point Okta, Entra or
whichever identity provider at `<public_url>/scim/v2`. Users and Groups are pushed here;
a group membership binds that group's policy document to the person even when the sign-in
token carries no groups claim. Setting a user inactive, or deleting them, de-provisions:
their bearer is refused from the next request, their managed connections are marked
revoked, their relay routes are dropped, and the evidence record says so. SCIM is additive
— an address it never heard of is unaffected — so an org that pushes nobody is not locked
out.

**Break-glass.** `POST /v1/admin/breakglass {group, reason, minutes}` suspends that group's
own policy document for the window (eight hours at most) so the org's document alone
applies to the group. It removes exactly one layer of tightening: never the org document,
never a machine's own settings, never a floor. The window expires on its own or ends early
with `DELETE`; every open and close is on the policy chain and in the evidence record.

**Release channel.** `PUT /v1/admin/release/channel {hold: true}` tells every updater "up to
date" whatever is published, until the hold lifts; `POST /v1/admin/release` publishes to the
org channel by API (the console's `release add --org` does the same).

**Revoking a connection.** `POST /v1/admin/connections/{id}/revoke` withdraws one person's
connection: its refresh is refused, its relay route dropped, and the desktop sees
`revoked` at its next sync and drops the token it holds.

## The end-to-end run

`scripts/e2e.sh` runs a coworker alone, then against the standalone broker, then against
this cloud — headless, with every check a curl — and stops at the first thing that does not
happen. Run it after anything that touches the contract: the seam between the two halves
is where the bugs that unit tests on either side cannot see live.

## Environment twins

Every scalar in the config has a `REMIT_CLOUD_<PATH>` twin — `REMIT_CLOUD_DATABASE_URL`,
`REMIT_CLOUD_ORG_SLUG`, `REMIT_CLOUD_AUTH_OIDC_GROUPS_CLAIM`, and so on — so a container
deployment needs no file at all. Environment wins over the file; the file wins over the
built-in defaults. The bare `DATABASE_URL` is also read, because that is what every
platform sets.

The GitHub App section has twins too: `REMIT_CLOUD_OAUTH_GITHUB_APP_ID`, `…_APP_SLUG`,
`…_CLIENT_ID`, `…_CLIENT_SECRET`, `…_PRIVATE_KEY_PATH`, `…_WEBHOOK_SECRET`.
Slack: `REMIT_CLOUD_OAUTH_SLACK_{CLIENT_ID,CLIENT_SECRET,SIGNING_SECRET,SCOPES}`; the GitHub
handle: `REMIT_CLOUD_OAUTH_GITHUB_MENTION`.

