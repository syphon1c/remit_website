---
title: "Architecture"
description: "Remit is a single Go binary per role. The web interface is compiled in via go:embed, so remit-server serves its own UI with no Node runtime and no…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Remit is a single Go binary per role. The web interface is compiled in via
`go:embed`, so `remit-server` serves its own UI with no Node runtime and no
separate static host.

## The shape of a turn

```
user message
   │
   ▼
TurnEngine ──► provider (single-shot HTTP)
   │                │
   │                ▼
   │           tool calls
   │                │
   ▼                ▼
events ◄──── permissions ──► reviewer (auto-approve only)
   │                │
   │                ▼
   │             audit journal
   │                │
   ▼                ▼
WebSocket        tool executes
```

The engine owns the loop. Providers are deliberately **single-shot**: they take
messages and return a response, and know nothing about tools executing,
approvals or sessions. That keeps provider code small and makes adding one a
contained job.

Every consequential tool call goes `permissions → (reviewer) → audit → execute`.
There is no path around it, which is what makes the governance claim in
[security](/docs/coworker/security/) true rather than aspirational.

## Packages

42 packages under `internal/`. The ones worth knowing:

### Core loop
| Package | Role |
|---|---|
| `engine` | the turn loop: model call → tool calls → events |
| `agent` | assembles a configured engine — tools, prompt, memory, roots |
| `providers` | one client per vendor, hand-rolled `net/http` |
| `events` | the event vocabulary the interface consumes |
| `tools` | the tool registry: schemas and callables |

### Governance
| Package | Role |
|---|---|
| `permissions` | the ladder |
| `risk` | tool → risk class |
| `overrides` | user-local risk overrides |
| `reviewer` | the LLM judge for auto-approve |
| `audit`, `provenance` | the hash-chained journal |
| `unattended` | where the human is: inline approval, or the inbox |
| `trust` | workspace trust |
| `readonly` | which shell commands are genuinely read-only |

### Capability
| Package | Role |
|---|---|
| `connectors` | 25+ native integrations |
| `mcpclient` | MCP client — stdio, streamable HTTP, OAuth 2.1/PKCE/DCR |
| `skills` | loadable skills |
| `personas` | coworkers, built-ins embedded via `go:embed`; authoring, install, gallery provenance |
| `cloud` | everything on the other side of a broker: sign-in, gallery, publishing, review, sign-in codes |
| `memory` | persistent memory (spec) |
| `teams` | the board and journal |
| `automation`, `selfwake` | scheduled and self-resumed runs |
| `catalog` | the vetted tool catalog every tool is classified against |
| `websearch` | the `web_search` tool and its providers |
| `attachments` | user messages plus files, turned into model content parts |
| `projects` | project identity — the key under boards and workspaces |

### Team galleries

A coworker can come from, and go to, a **gallery** — Remit Cloud's curated one,
or a self-hosted broker a company
runs itself. `cloud` is the whole client side of that, and it is deliberately
thin: the broker decides, this side asks.

| Concern | Where it is decided |
|---|---|
| May I install this? | here — the ordinary parser and install-time consent, whatever the source |
| May I publish? | the broker (`/v1/personas/{id}/publish` pre-flights against it) |
| May I review uploads? | the broker (`/v1/admin/whoami`; 404 to everyone else) |
| What version is this? | the broker assigns one per approval; the client records the CARD's |
| Is a code required to sign in? | the broker; the app is told by a 403 and asks for it |

Two properties are load-bearing and easy to erode:

- **A gallery install is not a new trust path.** A coworker arriving from a
  gallery goes through the same strict parser, the same install-time consent and
  the same refusals as a zip somebody handed you. The transport changed when
  bundles landed; the trust model did not.
- **The client never decides who may administer somebody else's broker.** It
  asks and takes the answer. Deciding here would mean forming an opinion about
  permissions on another machine, and being wrong in the permissive direction is
  the entire risk of an admin surface.

Skills travel with a shared coworker and RUN on the installing machine, which is
why consent shows them (`ConsentSummary`) and why a broker's operator reads them
before approving. Consent gates capability; it cannot gate intent — see
[security](/docs/coworker/security/#what-consent-can-and-cannot-tell-you).

### Surface
| Package | Role |
|---|---|
| `server` | HTTP + WebSocket, session manager |
| `inbox` | what is waiting for a person, and how it got routed there |
| `relay` | the managed-relay inbound client (Slack, GitHub) |
| `subscriptions`, `mentions` | channel subscriptions, and mention threads becoming sessions |
| `webui` | the embedded interface |
| `sessions`, `conversations`, `compaction` | session state and history |
| `secrets`, `config` | credentials and layered settings |

Plumbing not listed above — `envctx`, `tlsroots`, `version`, `sessionfacts` —
does what its name says and is best read directly.

## Providers

A provider implements one interface and does one thing: turn messages into a
response. Routing resolves a model string — optionally `provider:model` — through
a registry and capability matrix.

Vendor streaming is SSE. The interface transport is **WebSocket**, not SSE; the
two are unrelated and the boundary is the server.

There are no vendor SDKs. Every provider is hand-rolled against the REST API, so
there is no dependency that can silently change request shape, and proxying
through LiteLLM or any OpenAI-compatible gateway is just a base URL.

## State

SQLite via `modernc.org/sqlite` — pure Go, no cgo, so cross-compilation stays
trivial. Databases live in the state directory
([layout](/docs/coworker/configuration/#the-state-directory)).

Structured-but-small state (MCP servers, personas, trust, risk overrides) is
JSON rather than SQL, because it is read whole, written rarely, and worth being
able to inspect and edit by hand.

## The interface

`surfaces/gui` is a React + Vite app, built into `internal/webui/dist` by
`make ui` and embedded at compile time. `remit-server` serves it, so shipping is
one binary.

Tauri packaging is kept for a desktop build. The same source produces both.

## Wire compatibility

Remit began as a port of the Python OpenWorker backend and stays compatible with
its HTTP routes, WebSocket event names and payloads, and on-disk state formats.
That is why the state directory is still `~/.config/coworker`, and why the
server accepts both the `X-Remit-Token` and legacy `X-OpenWorker-Token` headers.

Compatibility is a constraint on *changing existing surfaces*, not on adding new
ones. Go-only additions — the MCP catalogue, broker endpoint settings, memory's
natural key and injection ceiling — are additive, and a client that does not
know them ignores them.
