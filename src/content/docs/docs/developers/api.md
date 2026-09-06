---
title: "The local API"
description: "The server exposes ~160 routes under /v1. This groups them by subsystem rather than listing each one — an exhaustive table would rot on the next…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

The server exposes ~160 routes under `/v1`. This groups them by subsystem rather
than listing each one — an exhaustive table would rot on the next change. For
the authoritative list:

```bash
grep -rhoE '"(GET|POST|PUT|PATCH|DELETE) /v1/[^"]*"' internal/server/*.go | sort -u
```

## Authentication

Every request needs the token from `~/.config/coworker/sidecar-<port>.token`,
with four deliberate exceptions:

| Path | Why it is tokenless |
|---|---|
| `/v1/health` | a liveness probe has to work before a client has read the token |
| `/auth/callback`, `/oauth/callback`, `/mcp/oauth/callback` | loopback OAuth redirects — the browser cannot carry the header |

Everything else:

```bash
TOKEN=$(cat ~/.config/coworker/sidecar-8765.token)
curl -H "X-Remit-Token: $TOKEN" http://127.0.0.1:8765/v1/health
```

`X-OpenWorker-Token` is still accepted for older clients. WebSocket clients pass
the token as a subprotocol instead — browsers cannot set headers on a handshake:

```js
new WebSocket(url, ["remit", token])   // "openworker" also accepted
```

Requests without a valid token get 401; a WebSocket handshake with a wrong token
gets 403. The interface document and its assets are served to a session cookie
rather than the token (see [security](/docs/coworker/security/#network-posture)); that cookie
never authorises `/v1`.

## WebSocket

| Endpoint | Carries |
|---|---|
| `/ws/events` | server-wide events: sessions, inbox, connectors |
| `/ws/session/{session_id}` | one conversation: streamed output, tool calls, approval cards, status |

Frames are `{type, data}`. The event vocabulary lives in `internal/events`, and
event names and payload keys are wire-compatible with the Python original.

Two frames on the session socket are Go additions, sent by the server when
state the interface would otherwise poll for has moved. Both are additive: a
client that does not know them ignores them.

| Frame | When | `data` |
|---|---|---|
| `inbox_changed` | an Inbox item for this session was parked or resolved, from any surface | `{session_id}` |
| `unattended_changed` | the session's unattended flag was set | `{session_id, unattended}` |

The interface reloads the session's pending items on the first and applies the
flag on the second, and keeps a slow poll only for a frame lost across a
reconnect. Both loops pause while the window is hidden.

## Route groups

Two additions worth naming because first-run setup depends on them:
`POST /v1/settings/cloud/probe {base_url}` asks a gallery address what it is
(its `GET /v1/discovery`) and returns the finding plus the derived endpoint
block, saving nothing; `GET /v1/cloud/status` carries `account_name` beside
`account` once signed in.


| Prefix | Routes | What it covers |
|---|---|---|
| `/v1/sessions` | 26 | create, list, resume, interrupt, model switch, roots, approvals |
| `/v1/connectors` | 23 | connect, disconnect, status, per-connector config |
| `/v1/settings` | 19 | models, providers, cloud endpoints, your identity, preferences |
| `/v1/personas` | 16 | installed coworkers, authoring, catalog, consent, publishing, updates |
| `/v1/mcp` | 11 | MCP servers, per-tool switches, the built-in catalogue |
| `/v1/skills` | 8 | installed skills, enable/disable |
| `/v1/memory` | 7 | list, add, edit, delete, settings |
| `/v1/automations` | 8 | scheduled runs |
| `/v1/providers` | 7 | provider keys and availability |
| `/v1/workspaces` | 6 | known workspaces, trust |
| `/v1/cloud` | 11 | broker sign-in, sign-in codes, gallery, and the review queue |
| `/v1/inbox` | 5 | pending items awaiting a human |
| `/v1/teams` | 4 | board spaces, the journal and its verification |
| `/v1/subscriptions` | 3 | event subscriptions |
| `/v1/browser` | 3 | browser-surface control |
| `/v1/audit` | 1 | the audit record; filter by `session_id`, `connector`, `tool`, `risk_class`; rows also carry `outside_content` |
| `/v1/health` | 1 | liveness, default workspace, model |

## Conventions

Responses are JSON objects. Most carry `ok`, with `error` when false:

```json
{"ok": true,  "id": 12}
{"ok": false, "error": "unknown scope nonsense"}
```

Lists are returned under a named key rather than as a bare array — `{"memory":
[…]}`, `{"servers": […]}` — so the shape can gain fields without breaking
clients.

**Additive fields.** Newer Go-only fields (memory's `injection` and project
identity, the MCP catalogue, cloud endpoint settings) are additive. Clients that
do not know them ignore them, and the upstream Python backend simply never sends
them — so a client sharing this API must treat them as optional rather than
assuming presence.

## Example

```bash
TOKEN=$(cat ~/.config/coworker/sidecar-8765.token)
API=http://127.0.0.1:8765

curl -s -H "X-Remit-Token: $TOKEN" $API/v1/health
curl -s -H "X-Remit-Token: $TOKEN" $API/v1/memory
curl -s -H "X-Remit-Token: $TOKEN" "$API/v1/mcp/catalog?all=1"
```
