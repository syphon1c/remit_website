---
title: "Remit Cloud API"
description: "Every route exists because a client calls it. Shapes and status codes are a contract: an unmodified remit-server signs in against this broker and…"
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Every route exists because a client calls it. Shapes and status codes are a
contract: an unmodified `remit-server` signs in against this broker and installs
coworkers from it.

| Method | Path                                          | Auth | Client caller |
| ------ | --------------------------------------------- | ---- | ------------- |
| `GET`  | `/healthz`                                    | –    | operators |
| `GET`  | `/v1/discovery`                               | –    | `cloud.Discover` — what this deployment is, before sign-in (service, version, auth mode, whether a code follows, publisher, relay); the same document a self-hosted remit-broker serves |
| `GET`  | `/authorize`                                  | –    | `cloud.BeginLogin` (browser) |
| `POST` | `/oauth/token`                                | –    | `cloud.CompleteLogin`, `cloud.FreshAccessToken` |
| `GET`  | `/v1/auth/callback`                           | –    | the browser, mid-sign-in |
| `GET`  | `/v1/me`                                      | ✔    | `cloud.FetchMe` |
| `GET`  | `/v1/connections`                             | ✔    | `cloud.SyncConnections` — the caller's own connections from the store (`connection_id`, `connector`, `status`, `tenant_metadata`); an empty list without one |
| `POST` | `/v1/connections/{id}/disconnect`             | ✔ db | `cloud.CloudDisconnect` — marks it disconnected and drops its relay route; another person's id is 404 |
| `GET`  | `/v1/personas/gallery`                        | ✔    | `cloud.GalleryList` |
| `GET`  | `/v1/personas/gallery/{slug}`                 | ✔    | `cloud.GalleryDetail` |
| `GET`  | `/v1/personas/gallery/{slug}/manifest`        | ✔    | `cloud.GalleryManifest` — plus `manifest_signature` when the gallery has a key; 410 `revoked` when the org policy withdrew it |
| `GET`  | `/v1/personas/gallery/{slug}/bundle`          | ✔    | `cloud.GalleryBundle` — plus `bundle_signature` when signed; 410 when withdrawn |
| `POST` | `/v1/personas/gallery/{slug}/install-events`  | ✔    | `cloud.GalleryInstallEvent` |
| `POST` | `/v1/identity`                                | ✔    | `cloud.AnnounceIdentity` |
| `POST` | `/v1/identity/verify`                         | ✔    | `cloud.SubmitVerification` (501 unless `require_verification`) |
| `POST` | `/v1/personas/gallery`                        | ✔    | publish a coworker (queued for review) |
| `GET`  | `/v1/admin/whoami`                            | ✔    | am I an operator here? |
| `GET`  | `/v1/admin/uploads`                           | ✔ op | the review queue |
| `GET`  | `/v1/admin/uploads/{slug}`                    | ✔ op | manifest + skills, in full |
| `POST` | `/v1/admin/uploads/{slug}/approve`            | ✔ op | publish, and reload the gallery |
| `POST` | `/v1/admin/uploads/{slug}/reject`             | ✔ op | discard |
| `GET`  | `/v1/admin/journal`                           | ✔ op | the record + chain status |
| `DELETE` | `/v1/personas/gallery/{slug}`               | ✔    | remove one you published |
| `POST` | `/v1/telemetry/events`                        | ✔ db | `cloud.EmitSessionCreated` — one session-started event; anything beyond the runtime's exact shape is 400 |
| `GET`  | `/desktop/latest.json`                        | – db | the runtime's updater (tauri-plugin-updater): 200 + static manifest when a release exists, **204** when up to date. A bearer is optional: a session selects its organisation's channel and honours its hold, an anonymous or unverifiable one is the public channel |
| `POST` | `/v1/releases`                                | token db | the build pipeline publishes a release `{version, notes?, pub_date?, org?, actor?, assets:[{target, url, signature}], installers?:[{target, label, url, sha256?, size?}]}`; `org` is a canary organisation's slug (404 unknown), the signature must parse (400), journalled as `ci:<actor>`. Installers feed the download page and never the manifest. Publishing a version the channel already carries **updates** it — date, notes, assets, installers — which is how a rollback re-points the channel at a good version. Mounted only with `[release] publish_token`; 401 otherwise |
| `GET`  | `/download`                                   | – db | the page people install from: the newest public release with its installers, sizes and SHA-256 checksums, grouped by platform; the updater's archives where a release recorded no installers. Also served at `/` on `[downloads] host`. `Cache-Control: max-age=300` |
| `GET`  | `/download.json`                              | – db | the same release as data: version, date, notes, installers per platform with size and SHA-256, in the page's order; `{"error":"no_release"}` 404 before the first publish. `Cache-Control: max-age=300`, `Access-Control-Allow-Origin: *` — the website's download buttons read it |
| `POST` | `/v1/oauth/{provider}/start`                  | ✔ db | `cloud.BeginManagedConnect` — `{connector, redirect, app_state, access?, flow?}` → `{authorize_url}`; `redirect` must be the desktop's loopback `http://127.0.0.1:<port>/oauth/callback`, anything else is 400; unknown provider 404 |
| `GET`  | `/v1/oauth/{provider}/callback`               | – db | the provider's browser redirect. Consumes the `state` once, exchanges the grant, records the connection, and answers a page whose form self-submits the token fields to the loopback (CSP `form-action` pinned to it). An unknown or used state is a 400 page |
| `POST` | `/v1/oauth/{provider}/refresh`                | ✔ db | `cloud.RefreshManagedToken` — `{refresh_token, connection_id, connector}` → `{access_token, refresh_token?, expires_in}`; `invalid_grant` 400 when the provider refuses; GitHub answers `unsupported_grant_type` (installation tokens are minted, not refreshed) |
| `POST` | `/v1/github/token`                            | ✔ db | `{installation_id}` → `{token, expires_at}` for an installation the caller connected; 404 otherwise, 501 without `[oauth.github]` |
| `GET`  | `/v1/relay/ws`                                | ✔ db | `relay.Hub` — the WebSocket the runtime dials with its bearer; set `cloud_relay_ws_url` to `wss://<host>/v1/relay/ws`. Frames are pushed down only; anything sent up is ignored |
| `POST` | `/v1/relay/github/disconnect`                 | ✔ db | `{installation_id}` — stop routing that installation's events to the caller |
| `POST` | `/v1/relay/slack/uninstall`                   | ✔ db | `{team_id}` — likewise for a Slack workspace |
| `POST` | `/v1/relay/slack/events`                      | sig db | Slack's Events API request URL. Verified with the app's signing secret (5-minute replay window); `url_verification` answered; `event_callback` routed by `team_id` to every connected desktop as `{provider:"slack", kind:"event", team_id, event, provenance}`; `app_uninstalled`/`tokens_revoked` drop the routes and push `revoked` once |
| `POST` | `/v1/relay/slack/interactivity`               | sig db | Slack's Interactivity request URL (`payload=` form field): `{kind:"interactivity", team_id, interaction}` |
| `GET`  | `/v1/policy`                                  | ✔ db | the signed policy documents that apply to the caller — the org's and one per IdP group — `{documents:[{document, policy_id, signature}], etag}`; `If-None-Match` → 304. Absent (an empty list) is absence of constraint |
| `GET`  | `/v1/admin/policy`, `/v1/admin/policy/groups/{group}` | ✔ op db | the current document for a scope; 404 `no_policy` when none |
| `PUT`  | `/v1/admin/policy`, `/v1/admin/policy/groups/{group}` | ✔ op db | issue a version from a draft `{keys, on_stale?, max_age?, refresh_after?}`; the lattice refuses the whole document on any key it cannot order (400 names it); 503 without a signing key; 409 when another version landed first |
| `GET`  | `/v1/admin/policy/versions`                   | ✔ op db | every version with actor, keys and time, plus `chain_intact` for the policy journal |
| `POST` | `/v1/evidence/events`                         | ✔ db | content-free events from a runtime (`{events:[{ts, kind, session?, risk_class?, policy_key?, policy_id?, tool?, connector?, outcome?, mode?}]}`, at most 500); an unknown field or a value outside its rule refuses the batch whole |
| `POST` | `/v1/evidence/anchors`                        | ✔ db | chain heads (`{anchors:[{chain, seq, hash, ts}]}`); each is advanced, repeat, or **fork**; a fork is journalled as a `chain_fork` event and returned |
| `GET`  | `/v1/admin/evidence/events`, `/summary`, `/anchors` | ✔ op db | the rows (`?since=&kind=&group=&limit=`), counts by kind x risk class x outcome and by group, and every chain's last anchor with its fork count |
| `GET`/`PUT` | `/v1/admin/evidence/retention`           | ✔ op db | `{retention_days >= 1, legal_hold}`; a change goes on the policy chain |
| `GET`  | `/v1/admin/evidence/export`                   | ✔ op db | every configured sink's cursor: last event id, last run, last error, rows exported |
| `POST` | `/v1/fleet/heartbeat`                         | ✔ db | `{device_id, version, os, arch, policy_ids, policy_fetched_at?, installed:[{id, gallery_slug?, version?, manifest_sha?, enabled}], connectors}` → `{expected_policy_ids}`; strict, ids and hashes only |
| `GET`  | `/v1/admin/fleet`, `/v1/admin/fleet/summary`  | ✔ op db | the inventory with `policy_current` per device, and counts (devices, current/stale, versions, coworkers, seen today) |
| `GET`/`POST` | `/v1/admin/breakglass`; `DELETE /v1/admin/breakglass/{id}` | ✔ op db | open `{group, reason (≥8 chars), minutes (≤480)}`: the group's document is suspended for the window; list the record; end early. Journalled and evidenced |
| `GET`/`PUT` | `/v1/admin/release/channel`              | ✔ op db | `{hold}`: while held the updater is told 204 whatever is published |
| `POST` | `/v1/admin/release`                           | ✔ op db | publish to the org channel: `{version, notes, pub_date?, assets:[{target, url, signature}]}` |
| `GET`  | `/v1/admin/connections`; `POST /v1/admin/connections/{id}/revoke` | ✔ op db | every connection in the org; revoke one — refused on refresh (403), dropped from the relay, shown as `revoked` to its owner |
| `*`    | `/scim/v2/{ServiceProviderConfig,Users,Users/{id},Groups,Groups/{id}}` | SCIM bearer, db | SCIM 2.0 provisioning: list (`filter=userName eq "…"`), create, replace, patch (`active`, group `members`), delete. `active=false` or delete de-provisions: the bearer is refused, connections revoked, routes dropped |
| `POST` | `/v1/relay/github/webhook`                    | sig db | the App's webhook URL, verified with `webhook_secret`. Routes only a comment/issue/PR that mentions `@<mention>` (kind `mention`) or is labelled with it (kind `label`); `installation deleted/suspend` drops routes and pushes `revoked`. Everything else is acknowledged and dropped |
| `POST` | `/v1/orgs`                                    | ✔ db | register an organisation `{slug?, name}` — the caller must hold an address the identity provider verified (403 `email_unverified`), becomes its `owner` on a trial; one organisation per address (409 `already_taken`). Mounted only with `[org] registration = true` |
| `GET`/`PUT` | `/v1/admin/org`                          | ✔ op db | the organisation as its administrators see it; PUT `{name, support_email}` is owner-only and goes on the policy chain |
| `GET`  | `/v1/admin/members`; `PUT`/`DELETE /v1/admin/members/{email}` | ✔ op db | members; PUT `{role}`; making or unmaking an owner is owner-only (403 `owner_required`); the last owner cannot be removed or demoted (409 `last_owner`) |
| `GET`/`POST` | `/v1/admin/invitations`; `DELETE /v1/admin/invitations/{email}` | ✔ op db | pending invitations; POST `{email, role}` → `{invitation, notified, join_link?}` — no token anywhere: accepting is signing in with that address, verified. 402 `seat_limit` when the plan is full (a resend is not a new seat); 409 `already_taken` names no other organisation |
| `GET`  | `/v1/admin/policy/lattice`                    | ✔ op db | the key table the console's policy editor is generated from |
| `GET`/`POST`/`DELETE` | `/console/session`                | – / cookie | the browser console's session: GET answers who the browser is (signed out is 200, not 401); POST `{access_token, expires_in}` turns a proved token into an httpOnly cookie plus a readable CSRF cookie; DELETE signs out. Every console write carries `X-Remit-CSRF`. See `docs/console.md` |
| `GET`  | `/console/`                                   | –    | the console itself, with its content policy; mounted when `[console] enabled` (on wherever there is a store) |
| `POST` | `/v1/billing/stripe`                          | sig db | the payment provider's webhook: signature over the raw body, then the event moves `org.plan` and nothing else. Mounted only with a webhook secret. See `docs/billing.md` |

`✔ op` needs an operator: an `owner` or `admin` of the caller's organisation, or — on a
deployment that has registered nobody — an established identity on the `[auth] operators`
allowlist. Everything so marked answers 404 to anybody else.

`db` routes exist only when a database is configured (`database_url` or `DATABASE_URL`);
without one they are not mounted — absent, not failing.

In `oidc` mode with `proxy_endpoints = false`, `/authorize` and `/oauth/token`
are not mounted — the client talks to the IdP directly.

Shapes:

```jsonc
// POST /v1/identity   — the worker says who its user is, after signing in
{ "first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com" }
// → mode `none`: the claim is taken
{ "ok": true, "applied": true, "identity": { "user_id": "remit-cloud|ada@example.com",
  "email": "ada@example.com", "name": "Ada Lovelace" },
  "verified": false, "verification_method": "none", "first_seen": "…" }
// → mode `oidc`: the IdP already said who this is; the claim is NOT applied
{ "ok": true, "applied": false, "reason": "this broker's identity comes from its identity provider",
  "identity": { /* from the token */ }, "verified": true, "verification_method": "oidc" }

// GET /v1/personas/gallery
{ "personas": [ { "slug": "...", "version": 1, "name": "...", /* … */ } ] }

// GET /v1/personas/gallery/{slug}   — the card ITSELF, not a wrapper
{ "slug": "...", "version": 1, /* … */ "pitch_markdown": "..." }

// GET /v1/personas/gallery/{slug}/manifest
{ "manifest_markdown": "---\nid: …", "manifest_hash": "sha256:<hex>" }

// GET /v1/personas/gallery/{slug}/bundle   — only for coworkers carrying skills
{ "bundle_b64": "UEsDBBQ…", "bundle_hash": "sha256:<hex>" }
```

The client recomputes `sha256` over `manifest_markdown` and **refuses the
install** on a mismatch, so the hash is taken over exactly the bytes served —
which is also why non-UTF-8 manifests are rejected at scan time rather than
served and silently corrupted by JSON encoding.

Any non-200, or a missing token, makes the client report the gallery as
unavailable and fall back to local personas. Nothing else in the app is
affected.

