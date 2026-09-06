---
title: "Running the server directly"
description: "The desktop app is how Remit is used. It carries the server inside its bundle and starts it for you; you never see it. This page is for the other…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

The desktop app is how Remit is used. It carries the server inside its bundle and starts
it for you; you never see it. This page is for the other cases: a machine with no desktop
— a build host, a shared Linux box — or a person who wants the terminal.

## What the app ships

The desktop bundle carries one binary beside the app, the **sidecar**: `remit-server`, the
local HTTP and WebSocket server with the web interface compiled in. On macOS it sits at
`RemitAI.app/Contents/Resources/sidecar/remit-server`; the Windows and Linux installers
place it beside the executable under `sidecar/`. It is the same program whether the app
launched it or you did.

The terminal worker (`remit`), the connector tool (`remit-connectors`) and the board CLI
(`remit-board`) are not in the desktop bundle today. Packages for headless Linux are on
the roadmap; until then, [ask us](mailto:hello@remit-ai.app).

## Start the server

```bash
remit-server --cwd ~/code/my-project --open
```

`--open` launches the interface in your browser. Without it, the server prints a URL
carrying a one-time token. It binds `127.0.0.1:8765` by default and is **not** reachable
from other machines. Every request needs the token it writes to
`sidecar-<port>.token` in the [state directory](/docs/coworker/configuration/#the-state-directory).

The web interface is the same interface the desktop app shows, minus the things only a
desktop can do: the `remit://` invite link is read as `?join=<address>` on the server's own
URL instead, and there is no tray or self-update.

## Configure it

Everything the app's Settings pages set is a key in `config.toml` or an environment
variable; [configuration](/docs/coworker/configuration/) lists every one. The two that matter first:

```bash
export ANTHROPIC_API_KEY=...        # or any other provider's key, see configuration.md
export COWORKER_STATE_DIR=/srv/remit/state   # where sessions, keys and the journal live
```

A key set in the environment is used as it is; a key added through **Settings ▸ Models**
is written to `secrets.json` in the state directory with owner-only permissions.

## The terminal worker

```bash
remit --cwd ~/code/project          # a coworker in the terminal
remit --model anthropic:claude-opus-4-8 --mode plan
remit --resume <session-id>
```

`remit` takes `--model`, `--mode`, `--resume <session-id>` and an optional skill to launch.
It runs the same engine under the same ladder: approvals arrive as prompts in the terminal
instead of cards.

## Connectors and the board from the command line

```bash
remit-connectors status              # which connectors are configured, and their health
remit-board board --help             # the work-item board
remit-board journal --help           # its hash-chained journal
remit-board board mcp                # the board as an MCP server, for a coworker to work it as a tool
```

The board is what leads and workers coordinate over: leads plan and staff, workers claim
items, act inside the remit granted, and answer for what they did in the journal. In the
app it is reached from the composer's **Attach ▸ Board** menu; on the command line it is
this binary.

## Ports and tokens

Every HTTP and WebSocket request needs the token from `sidecar-<port>.token`, sent as
`X-Remit-Token`. WebSocket clients pass it as a subprotocol, because browsers cannot set
headers on a handshake. Opening the interface with `?token=<token>` exchanges it for an
`HttpOnly`, `SameSite=Strict` session cookie that authorises the interface document and
its assets only, never the API. The full surface is in the [API reference](/docs/developers/api/).
