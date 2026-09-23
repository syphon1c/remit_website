---
title: "The local API"
description: "The server exposes ~205 routes under /v1. This groups them by subsystem rather than listing each one — an exhaustive table would rot on the next…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

The server exposes ~205 routes under `/v1`. This groups them by subsystem rather
than listing each one — an exhaustive table would rot on the next change. ## Authentication

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

Frames are `{type, data}`. Event names and payload keys are wire-compatible with the Python original.

Two frames on the session socket are Go additions, sent by the server when
state the interface would otherwise poll for has moved. Both are additive: a
client that does not know them ignores them.

| Frame | When | `data` |
|---|---|---|
| `inbox_changed` | an Inbox item for this session was parked or resolved, from any surface | `{session_id}` |
| `unattended_changed` | the session's unattended flag was set | `{session_id, unattended}` |
| `effort_changed` | the session's reasoning effort was set, from any view | `{effort, text}` — `text` is the transcript notice, `""` on a session with no history yet |

The interface reloads the session's pending items on the first and applies the
flag on the second, and keeps a slow poll only for a frame lost across a
reconnect. Both loops pause while the window is hidden.

An `error` frame on the session socket carries `fatal: true` when reconnecting
cannot change the answer — the interface stops redialling and offers no Retry.
Its text names the reason: the folder gate keeps `no valid workspace — choose a
project folder first`; any other refusal to start a session reads `could not
start this session: …` and is logged. Additive.

A `user_message` frame may carry `grapevine`, `{post, listen, interest,
ask_before_fetch?}`, on the first message of a conversation that has no row
yet: the server rebuilds the engine with those switches before the turn and
writes them to the record at the first save. Additive.

## Route groups

The counts below are checked against the registered routes by a test, so a route added without a line here is a red suite rather than a table that quietly goes stale.

Two additions worth naming because first-run setup depends on them:
`POST /v1/settings/cloud/probe {base_url}` asks a gallery address what it is
(its `GET /v1/discovery`) and returns the finding plus the derived endpoint
block, saving nothing; `GET /v1/cloud/status` carries `account_name` beside
`account` once signed in.


| Prefix | Routes | What it covers |
|---|---|---|
| `/v1/sessions` | 31 | create, list, resume, interrupt, model switch, roots, approvals, session grants, Grapevine switches |
| `/v1/connectors` | 25 | connect, disconnect, status, per-connector config |
| `/v1/settings` | 25 | models, providers, model tiers, cloud endpoints, your identity, preferences, the Grapevine switch |
| `/v1/personas` | 16 | installed coworkers, authoring, catalog, consent, publishing, updates |
| `/v1/cloud` | 13 | broker sign-in, sign-in codes, gallery, and the review queue |
| `/v1/mcp` | 11 | MCP servers, per-tool switches, the built-in catalogue |
| `/v1/automations` | 8 | scheduled runs, their model pin, their runs and deliverables |
| `/v1/skills` | 8 | installed skills, enable/disable |
| `/v1/memory` | 7 | list, add, edit, delete, settings |
| `/v1/providers` | 7 | provider keys and availability |
| `/v1/judges` | 4 | the key for a judge that reviews approval cards, a test of it, and the switch (`POST /v1/judges/shadow`, `{enabled}`) that turns it on for the record in sessions started from then on — refused where `reviewer.allowed_judges` forbids it, audited as `judge_shadow`; `GET` reports `allowed`, `shadow_judge_set` and `shadow_on` as they are in force, and `last_verdict_at` — epoch seconds of the newest verdict the judge wrote, null until there is one — so the card can say *running · last verdict 7m ago* the way a provider tile says *used 7m ago*. Separate from `/v1/providers` because a judge is not a model you can pick: it answers typed questions, it is never routable as a session model, and a saved key alone starts nothing. Additive |
| `/v1/workspaces` | 6 | known workspaces, trust |
| `/v1/inbox` | 5 | pending items awaiting a human |
| `/v1/teams` | 4 | board spaces, the journal and its verification |
| `/v1/grapevine` | 4 | published work: list, read one, delete one, open an output. 404 while the feature is off |
| `/v1/browser` | 3 | browser-surface control |
| `/v1/subscriptions` | 3 | event subscriptions |
| `/v1/messaging` | 2 | which session a platform DM routes to |
| `/v1/standing` | 2 | standing allowances a person has taught, and forgetting one |
| `/v1/web-search` | 2 | the search provider and a direct search |
| `/v1/_debug` | 1 | inject an inbound message; test surface, off unless enabled |
| `/v1/agents` | 1 | the coworkers this machine can run |
| `/v1/attachments` | 1 | inspect a PDF before attaching it |
| `/v1/channels` | 1 | recently used connector channels |
| `/v1/chat` | 1 | an OpenAI-shaped completions endpoint |
| `/v1/desktop` | 1 | which update source the desktop app polls |
| `/v1/digest` | 1 | what coworkers delivered since a time: runs and their deliverables, board items done, one text |
| `/v1/health` | 1 | liveness, default workspace, model |
| `/v1/reviewer-stats` | 1 | the reviewer's record across every session: live and shadow buckets, and each shadow verdict beside the person's decision on the same card |
| `/v1/unrouted` | 3 | inbound messages no session claimed and failed background turns; `DELETE /v1/unrouted/{ts}` dismisses one entry, `DELETE /v1/unrouted` clears the list |
| `/v1/board` | 18 | the board's own API, under its per-actor tokens — items, claims, the journal, `verify` |
| `/v1/audit`, `/v1/audit/verify` | 2 | the audit record; filter by `session_id`, `connector`, `tool`, `risk_class`, and by day with `since` / `until` (`YYYY-MM-DD`, UTC, inclusive); page by keyset with `before_id` (rows older than that id, filters kept) and `limit` (1–500); the reply carries `total`, how many rows the filters match in the whole record. Rows also carry `outside_content`, `model`, `provider`, `prev_hash`, `hash`, and `hash_fields_version` — which list of fields the row’s seal covers, absent on rows sealed before it was recorded. Reviewer rows judged by a typed judge add `judge` (which backend answered), `judge_model` (the model that actually replied), `judge_clause` (which rule decided), `judge_confidence`, `judge_questions` (the edition of the question texts) and `judge_signals` (the decomposed readings, as JSON); all six are absent on rows no judge produced and on rows written before they existed. `verify` recomputes the chain: `verified`, `entries`, `unchained`, `head`, and `detail` when it broke |

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

`GET /v1/standing` lists the standing allowances a person has taught (`{id, tool, target, created_at, session_id, call_id}`) and `teachable`, whether the organisation's `standing.allowances.allowed` policy permits new ones; `POST /v1/standing/remove` with `{id}` forgets one, live for every open session. Every parked approval item carries `standing_target` when its call names an exact target (formerly only an automation's did); the resolution `always_standing` on such a card teaches the allowance and approves once (audited as `standing_allowance_added`; refused and downgraded to once inside an automation run, for a fetch or a search, for a call with no target, or under policy). Additive.

A `permission_required` event and a parked approval item (`data`) carry `human_only` when only a person may answer the ask and `grantable` when a session grant would be honoured for it even so — the cross-session floor, after the first yes; the resolution `always_tool` on such a card grants the tool for the session. `GET /v1/sessions` rows carry `attention_inbox`, of `attention` (every pending ask for the session) the ones the cross-session Inbox lists. `GET /v1/sessions/{id}/grapevine?agent=<id>` on a conversation with no row yet answers with that coworker's own defaults and `saved: false`. Additive.

A `permission_required` event and a parked approval item carry `floor` when a floor raised the card: `outside_content`, `external_budget` or `egress_hosts` (the last additive, 2026-09-21: a fetch that would take the turn to one more distinct host than it may reach on its own). The resolution `allow_reply_channel` on a `send_message` to a Slack target names the channel under Replies without asking, pins the live session's reply, and approves once (audited as `reply_channel_added`). The resolution `allow_domain_config` on a fetch adds the url's host to Always-allowed destinations (validated: egress with a url, the organisation's domain policy; audited as `allowed_domain_added`) and approves once; every open session receives the entry. `POST /v1/connectors/slack/reply-channels/add` and `…/remove` with `{team_id, channel_id}` name the channels a coworker may reply into without a card; `reply_channels` appears on the Slack connector row and its workspace rows. Additive.

`GET /v1/settings` carries `model_caps`, `{id → capabilities}` for every selectable model: the five the matrix verifies (tools, vision, pdf, parallel tool calls, streaming) and three the family decides (`thinking`, `caching`, `structured_output`). Additive.

`GET /v1/memory` rows carry `persona` and `persona_label`, or `team`, for the two scopes added on 2026-09-09 (`persona`: one coworker in every project; `team`: one board space, every member); `scope` names them. A journal entry of kind `decision` is written to the team's memory as it is appended. The coworker gains `memory_search {query}`. Additive.

A run's record carries `deliverables`, `[{kind, uri, title?, hash?, bytes?}]`: `file` with `artifact:<path>` and the file's sha256, `message` with the destination. `GET /v1/digest?since=<epoch>` returns `{since, until, runs:[{task_id, task_title, run_id, status, trigger, finished_at, deliverables, result}], items:[{space, id, title, actor, at, refs}], text}` — the runs that finished since, the board items moved to done since, and the same rendered as a message. Additive.

`PATCH /v1/sessions/{id}` also takes `color` and `icon` — a conversation's look, chosen by the person: one of eight label hues (`red`, `orange`, `amber`, `green`, `teal`, `blue`, `violet`, `pink`) and one of the line glyphs the Edit dialog offers, `""` to clear, alone or beside `title`. A name off either list is refused with the reason and nothing is written; a look never touches `updated_at` or the rename mark, so a colour picked on an auto-titled conversation does not freeze its title. `GET /v1/sessions` rows carry both. `{title}` alone answers exactly what it always did. Additive.

`GET /v1/sessions/{id}/connections` carries `grants`, `{tools, commands}` — the "Always allow" decisions made in this session, kept with it. `POST /v1/sessions/{id}/grants/revoke` with `{tool}` or `{command}` removes one, only while the session is idle; refused with the reason otherwise. Audited as `session_grant_revoked`. Additive.

`GET /v1/board/verify?space=` under the board's per-actor token recomputes the space's hash chain: `{verified, entries, detail?}`, 200 on a broken chain. Additive.

Automation rows carry `retry_at` (epoch seconds, or `null`) while the scheduler holds one retry for a failed run; a retry run's record carries `trigger: "retry"`, `retry_of` and the failed run carries `retryable`. Additive.

`PATCH /v1/automations/{id}` accepts `model`: a model from the picker pins the automation's runs to it, `""` clears the pin so runs follow the default model again. A model not in the picker, or one the organisation's policy forbids, is refused with the reason. The task payload carries `model` (`null` when following the default). Additive.

`GET /v1/settings` carries `provider_titles`, `{provider name → title}` for every provider the build knows, so a client can name the provider a custom model routes to without fetching the provider list; a custom id has no entry in `model_labels`. Additive.

`GET /v1/settings` also carries the model tiers: `reviewer_model` and `helper_model` (the pins, `""` for automatic) and `reviewer_model_effective` / `helper_model_effective` (what automatic resolves to for the default model). `POST /v1/settings/model-tiers` with either key sets a pin and replies with all four. Additive.

Reasoning effort rides the same surfaces: `GET /v1/settings` carries `reviewer_effort` (the reviewer's own pin, `""` for the model's default), `reasoning_effort` (what a new session starts with) and `effort_levels` (the scale: `low`, `medium`, `high`, `max`); `POST /v1/settings/model-tiers` accepts `reviewer_effort` and refuses a level off the scale. `model_caps[id].effort` says whether a model takes one. A session's own effort is the `effort` field on its record and on the socket's `ready` frame; `set_effort {effort}` changes it (refused mid-turn, like `set_model`) and every view hears `effort_changed {effort, text}`. Additive.

`GET /v1/sessions/{id}/reviewer-stats` is one conversation's reviewer record and `GET /v1/reviewer-stats` every session's: `live` and `shadow` buckets (`checks`, `allow`, `deny`, `unsure`, `error`, and the token totals) and `agreement` — every shadow verdict joined to the person's decision on the same card, as `<allow|deny|unsure|error>_<approved|refused|undecided>` cells with `cards` (joined) and `unmatched` (a verdict whose card is still open or was never answered). A verdict row's `status` is `error` when the check itself failed rather than the model judging. Both take `judge`, `model` and `risk_class` query parameters, which narrow the reviewer's rows to one backend, one chat model and one kind of card (the person's decisions are joined by call, never filtered); the reply carries `facets` — `{models, risk_classes, judges}`, every value there is to narrow by over the unfiltered scope — and echoes `filter`. `judge` is a peer of `model` rather than a refinement of it: a row a typed judge wrote names no provider model, so `model` cannot tell two backends apart, and `models` means only which chat models judged. Additive.

A persisted message with `role: "user"` that no person typed carries `_author`, naming the writer: `engine` (a completion nudge, the step limit, an error-streak prompt), `wake` (a self-wake resume) or `delivery` (a connector message, a teammate's hand-off, a Grapevine post — the `source` sidecar says which). A message with no `_author` was typed by the session's user. Like the other underscore-prefixed keys it is display-only and never reaches a model. Clients may ignore it. Additive.

A `tool_proposed` event carries `call_id`. A `reviewer_shadow` event — `{call_id, name, verdict, reason}` — says what the reviewer would have decided about a card the person answered; it may arrive after the turn ended, and the tool message's `_display` carries the same `shadow_verdict` and `shadow_note` for a reload. An `approval_resolved` row for a card open when the person pressed Stop carries `status: interrupted`, and one whose answering request went away before anyone decided carries `status: abandoned`. Neither is a refusal. Additive.
