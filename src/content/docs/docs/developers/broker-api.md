---
title: "Broker API"
description: "Every route exists because a client calls it. Shapes and status codes are a contract: an unmodified remit-server signs in against this broker and…"
---

<p class="rm-synced">Part of the remit-broker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Every route exists because a client calls it. Shapes and status codes are a
contract: an unmodified `remit-server` signs in against this broker and installs
coworkers from it.

| Method | Path                                          | Auth | Client caller |
| ------ | --------------------------------------------- | ---- | ------------- |
| `GET`  | `/healthz`                                    | –    | operators |
| `GET`  | `/v1/discovery`                               | –    | `cloud.Discover` — what this broker is, before sign-in (service, version, auth mode, whether a code follows, publisher, relay) |
| `GET`  | `/authorize`                                  | –    | `cloud.BeginLogin` (browser) |
| `POST` | `/oauth/token`                                | –    | `cloud.CompleteLogin`, `cloud.FreshAccessToken` |
| `GET`  | `/v1/auth/callback`                           | –    | the browser, mid-sign-in |
| `GET`  | `/v1/me`                                      | ✔    | `cloud.FetchMe` |
| `GET`  | `/v1/connections`                             | ✔    | `cloud.SyncConnections` (empty by design) |
| `GET`  | `/v1/personas/gallery`                        | ✔    | `cloud.GalleryList` |
| `GET`  | `/v1/personas/gallery/{slug}`                 | ✔    | `cloud.GalleryDetail` |
| `GET`  | `/v1/personas/gallery/{slug}/manifest`        | ✔    | `cloud.GalleryManifest` |
| `GET`  | `/v1/personas/gallery/{slug}/bundle`          | ✔    | `cloud.GalleryBundle` |
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

`✔ op` needs an operator: an established identity on the `[auth] operators`
allowlist. Everything so marked answers 404 to anybody else.

In `oidc` mode with `proxy_endpoints = false`, `/authorize` and `/oauth/token`
are not mounted — the client talks to the IdP directly.

Shapes:

```jsonc
// POST /v1/identity   — the worker says who its user is, after signing in
{ "first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com" }
// → mode `none`: the claim is taken
{ "ok": true, "applied": true, "identity": { "user_id": "remit-broker|ada@example.com",
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

