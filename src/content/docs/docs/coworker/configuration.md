---
title: "Configuration"
description: "Most people never open this file: the app's Settings pages set everything a person changes day to day, and store it here. This page is for the rest — a…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Most people never open this file: the app's **Settings** pages set everything a person
changes day to day, and store it here. This page is for the rest — a machine with no
desktop, a fleet configured by hand, or a setting Settings does not expose — and it is
the reference for what each Settings page writes.

Settings come from three layers, each overriding the one above:

1. built-in defaults
2. `~/.config/coworker/config.toml` — your global settings
3. `<workspace>/.coworker/config.toml` — per-project settings

## What a project may NOT set

A repository you clone can carry its own `.coworker/config.toml`, so some keys
are **user-global only**. A project cannot widen what the agent is allowed to do
without asking you:

| Key | Why it is global-only |
|---|---|
| `auto_allow` | would let a repo auto-approve its own tools |
| `allowed_domains` | would let a repo widen network reach |
| `external_budget` | would let a repo widen how much one of its turns can do |
| `tokens_per_hour` | would let a repo raise what its sessions may spend |
| `browser_path` | would let a repo choose which binary runs with this machine's network position |
| `approval_ttl` | would let a repo keep an unattended run parked longer than the machine allows |
| `run_retry_after` | would let a repo decide how often a machine re-runs work unattended |
| `stream_idle_timeout` | is applied to the whole process; a repo must not be able to switch the watchdog off for the server |
| `reviewer_model` / `helper_model` | the reviewer is a judge; a repo must not be able to choose who judges it |
| `auto_approve` / `auto_approve_shadow` | would let a repo relax the reviewer |
| `cloud_auth_insecure` | would let a repo downgrade sign-in to plain HTTP |
| `cloud_policy_pubkey` | would let a repo choose whose policy the machine trusts |
| `cloud_gallery_pubkey` | would let a repo choose whose coworkers the machine trusts |

`allowed_commands` is the one exception, and only conditionally: a project's
command allowances merge in **after you trust that exact workspace path**. Until
then they are advisory. See [security](/docs/coworker/security/#workspace-trust).

## Keys

### Model and behaviour

| Key | Default | Meaning |
|---|---|---|
| `model` | `gpt-5.6-sol` | default model id, optionally `provider:model` |
| `mode` | `interactive` | starting permission mode |
| `max_iterations` | `150` | tool-call ceiling for one turn. At the ceiling the coworker is asked for a summary with tools withheld; unattended with its plan still open it continues in a wake of its own, twice per brief ([using Remit](/docs/coworker/using-remit/#the-plan-and-what-done-means)) |
| `model_proxy_url` | *(unset)* | route providers through LiteLLM or any OpenAI-compatible gateway |
| `browser_path` | *(unset)* | the browser binary the browser tools drive. Unset, Remit looks in the usual places for Chrome, Chromium, Edge and Brave; it never downloads one. Global-only ([the browser](/docs/coworker/using-remit/#the-browser)) |
| `approval_ttl` | `24h` | how long a prompt an unattended run parks — an approval, a question, a plan, a folder or tool request — waits for an answer before it resolves as expired (which counts as a decline). `0` waits forever. Global-only ([approvals](/docs/coworker/using-remit/#approvals-the-part-worth-understanding)) |
| `run_retry_after` | `10m` | how long after a scheduled run fails for the runtime's own reasons — the model or provider failed, the response stalled, a tool crashed — it is run once more. `0` never. One retry; never while a run of the task is going, never when the next scheduled run is sooner ([automations](/docs/coworker/using-remit/#skills-and-automations)). Global-only |
| `web_search_provider` | `duckduckgo` | `duckduckgo` (keyless), `tavily` or `brave` |
| `model_fallbacks` | *(none)* | models to try in order when the model fails with something worth failing over — an overload, a transport failure, a stall. Each entry may be a bare id or `provider:model`. Never for a bad request, auth, or a context overflow, and never after a byte of a reply has streamed ([the model layer](/docs/coworker/security/)) |
| `stream_idle_timeout` | `120s` | how long a model response may go quiet before the connection is dropped and the turn told the model stopped responding. `0` waits the whole ten-minute request timeout. Global-only |
| `reviewer_model` | *(automatic)* | the model the Auto-Approve reviewer and the done-ness critic judge with. Automatic is the session model's helper tier, else the session model. **Settings ▸ Models** pins win over this. Global-only ([security model](/docs/coworker/security/#the-reviewer)) |
| `helper_model` | *(automatic)* | the model for compaction summaries (unless `compaction_model` pins one), session titles and explorer subagents; the same automatic. Settings pins win. Global-only |

### Server

| Key | Default | Meaning |
|---|---|---|
| `host` | `127.0.0.1` | bind address. Changing this exposes Remit to your network — read [security](/docs/coworker/security/) first |
| `port` | `8765` | bind port |

### Permissions

| Key | Default | Meaning |
|---|---|---|
| `allowed_commands` | *(empty)* | command prefixes that run without an approval prompt |
| `auto_allow` | *(empty)* | tools auto-approved in `custom` mode |
| `external_budget` | `50` | actions with effects beyond this machine one turn takes on its own before the rest reach you. The global default; a session can override it in its Access panel. Clamped to 1–500: the allowance can be raised, never removed ([security model](/docs/coworker/security/)) |
| `tokens_per_hour` | `0` (off) | the most a session — with its team, or an automation across its runs — may spend in a rolling hour before a new turn is refused: `tokens_in + tokens_out + cache_write` over the audit's model-call rows. `POST /v1/settings/tokens-per-hour` sets it from the interface; an organisation's `limits.tokens_per_hour` can lower it ([security model](/docs/coworker/security/#how-much)) |
| `allowed_domains` | *(empty)* | hosts `web_fetch` may reach without asking — and the destinations exempt from the outside-content floor, since a host named here was chosen before any turn read anything ([outside content](/docs/coworker/outside-content/)) |
| `auto_approve` | `false` | enable the LLM reviewer in auto-approve mode |
| `auto_approve_shadow` | `false` | reviewer records what it *would* have decided while you still decide |

`allowed_commands` ships **empty on purpose**. There is no generally safe
executable: nominally read-only programs can read secrets outside the workspace,
expand environment variables, load project-controlled config, or execute helpers
(`find -exec`, pytest collection). Adding a prefix here is you accepting that
authority.

### Cloud

These point at a broker for sign-in and shared personas. They are configuration,
not constants, so a self-hosted or staging deployment can point elsewhere.

You rarely set them by hand. First-run setup, and **Settings ▸ Cloud**, take a
gallery's address and derive the block from what the gallery says about itself
(`GET /v1/discovery`, which both remit-broker and Remit Cloud serve without a
sign-in): the auth domain is the gallery's host, the audience is the one it
validates or else its own address, the client id is the one it insists on or
else the default, the relay is configured only where the gallery runs one, and
`cloud_auth_insecure` is set exactly when the address is `http://`. The probe
itself is `POST /v1/settings/cloud/probe`; it saves nothing.

| Key | Default |
|---|---|
| `cloud_base_url` | `https://api.remit-ai.app` |
| `cloud_auth_domain` | `api.remit-ai.app` — the broker, not the identity provider: Remit Cloud proxies `/authorize` and `/oauth/token` unless it sets `proxy_endpoints = false` |
| `cloud_client_id` | `remit-desktop` — a placeholder, and inert while the broker proxies, because the broker overwrites `client_id` with its own before forwarding. Only a `proxy_endpoints = false` deployment needs a real one here |
| `cloud_audience` | `https://api.remit-ai.app` — **must match** the broker's `[auth.oidc] audience`, which must match an API identifier registered at the identity provider. The broker passes this through untouched and then validates the token carries it |
| `cloud_relay_ws_url` | `wss://api.remit-ai.app/v1/relay/ws` |
| `desktop_update_url` | *(unset)* — `https://api.remit-ai.app/desktop/latest.json` | where the desktop asks for its update manifest; set for a mirror when the built-in is unreachable. The cloud session accompanies the poll only when this is the origin the machine is signed in to; a mirror is polled anonymously. See releasing.md |
| `cloud_auth_insecure` | `false` — build sign-in URLs with `http://`. **Local broker development only**: it puts the authorization code on the wire in the clear. Global-only. |
| `cloud_policy_pubkey` | *(the development key)* — the minisign public key that signs your organisation's policy documents (bare base64, the key file, or base64 of it). Provisioning, never policy: a document cannot move where documents come from. Global-only. |
| `cloud_gallery_pubkey` | *(the development key)* — the key a Remit Cloud signs coworkers with. A signed coworker whose signature does not verify is refused; an unsigned one installs as before unless policy sets `personas.require_signature`. Global-only. |

## Environment variables

### Provider keys

`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`,
`LITELLM_API_KEY`, `AWS_BEARER_TOKEN_BEDROCK`.

Base-URL overrides, for proxies and self-hosted endpoints:
`ANTHROPIC_BASE_URL`, `OPENAI_BASE_URL`, `GEMINI_BASE_URL`, `LITELLM_BASE_URL`.

### Remit itself

| Variable | Effect |
|---|---|
| `COWORKER_STATE_DIR` | move the state directory (useful for testing against throwaway state) |
| `COWORKER_PORT` | published *by* the server as the port it actually bound, so loopback OAuth callbacks reach this process. Setting it yourself has no effect — `remit-server` overwrites it. Use `--port`, or `port` in `config.toml` |
| `COWORKER_API_TOKEN` | supply the API token instead of reading the sidecar file |
| `COWORKER_SCRATCH_BASE` | where per-session temporary folders are created (default `~/Remit`); see [temporary folders](#temporary-folders) |
| `OCW_BOARD_URL` / `OCW_BOARD_TOKEN` / `OCW_BOARD_SPACE` | `remit-board` against a remote board, instead of `--url` / `--token` / `--space` |
| `COWORKER_EXIT_WITH_PARENT` / `COWORKER_PARENT_PID` | exit when the launching process does |
| `SSL_CERT_FILE` / `SSL_CERT_DIR` | custom CA roots, honoured by all four binaries on macOS, where Go normally ignores them. They **replace** the system roots rather than adding to them, so a bundle that must also reach public sites has to contain those roots too; if what you point at holds no usable certificate, the command says so rather than carrying on with the roots you meant to displace |
| `NO_COLOR` | disable TUI colour |

Connector endpoint overrides for self-hosted instances: `GITHUB_API_URL`,
`GITHUB_GIT_URL`, `SLACK_API_URL`.

## The state directory

`~/.config/coworker`, or `$COWORKER_STATE_DIR`. On Windows, `%APPDATA%\coworker`.

The name predates the rename to Remit and is kept deliberately so existing
installs keep working.

| Path | Holds |
|---|---|
| `config.toml` | your global settings |
| `prefs.json` | interface preferences, and the local identity below |
| `secrets.json` | API keys and connector credentials, owner-only |
| `coworker.db` | memories and sessions |
| `chat.db` | team chat |
| `journal.db` | the hash-chained audit journal |
| `teams.db`, `automation.db` | board/journal and scheduled runs |
| `sidecar-<port>.token` | local API token, one per port |
| `mcp.json` | configured MCP servers |
| `personas.json`, `skills/`, `tools/` | installed coworkers, skills and tools |
| `personas-builtin/` | the built-in coworkers' skills, written out of the binary at every start; behind the self-protection floor like `personas-installed/` |
| `risk_overrides.json` | your per-tool risk overrides |
| `workspace_trust.json` | which workspace paths you have trusted |
| `memory-settings.json` | the memory switches and your standing rules |
| `attachments/` | files exchanged in conversations |

## Temporary folders

A session started without a project folder works in a temporary folder of its own,
`~/Remit/<session id>` by default — `COWORKER_SCRATCH_BASE`, or **Settings ▸ General ▸
Files**, moves the base. The interface labels it "Temporary folder" and offers *Save as
project…* when there is something in it worth keeping. Automations get one each too, under
`__task__<id>`.

Deleting a conversation deletes its folder, whatever it holds. Everything else is pruned by
a sweep at every start, and the sweep is deliberately narrow. A folder is removed only when
**all** of these are true:

- its name is a session id — something Remit created;
- it is **empty**. The sweep never deletes a file. A folder with files in it and no session
  left to reach it from is listed in the server log, and left where it is, for you to decide;
- no conversation or automation in this state directory owns it;
- it has been untouched for a week. Two servers can share one base — a second one on a
  throwaway state directory, as `docs/development.md` suggests — and every folder of the
  first reads as unowned to the second. The week is what keeps the second server's sweep
  off a session somebody still has open in the first; if it ever happened the harm is
  small (the folder is re-provisioned when the session is next built, and any write
  recreates it), but a week of silence from an empty folder is a safe enough sign.

Nothing else at the base is touched: not a file, not a folder with some other name.

## Invite links

`remit://join?gallery=<address>` opens Remit on "join a gallery" with the address
filled in. remit-broker prints the link for its own address at every start, and
Remit Cloud puts it in invitation mail and returns it as `join_link` when an
invitation is created. The desktop app registers the `remit` URL scheme; the
browser build reads the same request as `?join=<address>` on its own URL and
strips it after reading.

What the link may carry: an http(s) address with a host, and nothing else — any
other scheme, a path other than `join`, credentials or a fragment, and the link
is ignored before it reaches the interface. What it does: fills the box. What it
never does: probe on its own, sign in, or save. On a machine under a policy it is
refused with the organisation's name.

## Your identity

Setup asks for a name, surname and email, stored in `prefs.json`:

```json
"identity": {
  "first_name": "Ada",
  "last_name": "Lovelace",
  "email": "ada@example.com"
}
```

Set it in the first-run wizard, or any time in **Settings ▸ General ▸ You**. It
is editable there for good — the wizard only runs for installs that have not
completed setup, so Settings is where an existing install sets it.

Three things worth being clear about:

- **Remit itself never verifies it.** Nothing is checked on this machine, and no
  mail is generated here: it is a label you choose. A self-hosted gallery *may*
  check it — some require a one-time code as part of signing in, and then the
  address has been confirmed by that gallery rather than by Remit. Assume it is
  an unproven claim unless your gallery asks you for a code.
- **The email is the identifier.** It is lower-cased and trimmed when stored,
  because a self-hosted broker uses it to attribute shared coworkers to a
  person, and `A@corp.com` and `a@corp.com` must not become two owners.
- **It is not a credential**, which is why it lives in `prefs.json` rather than
  `secrets.json`. It grants nothing and unlocks nothing.

Leaving it blank is allowed — setup can be skipped — and everything local keeps
working. It is only needed to publish a coworker to a shared gallery.

**What is sent, and when.** After a successful sign-in to a self-hosted broker,
Remit posts the identity once to `POST /v1/identity` there. If that gallery
requires a sign-in code, it issues one at this point and Remit asks you for it
before the gallery opens. It is not sent
anywhere else, it never appears on a URL, and it is not sent at all while the
identity is incomplete or you are signed out. Remit Cloud does not serve that
route and answers 404, which is a no-op — sign-in has already succeeded by then,
so nothing about it can fail visibly.

A broker that authenticates through its own identity provider **ignores** the
claim and keeps the identity its IdP verified. That is the broker working
correctly, not an error: a self-asserted name must never be able to override a
verified one.

## Ports and tokens

Every HTTP and WebSocket request needs the token from
`sidecar-<port>.token`, sent as `X-Remit-Token` (the older
`X-OpenWorker-Token` is still accepted). WebSocket clients pass it as a
subprotocol instead, because browsers cannot set headers on a handshake.

Opening the interface with `?token=<token>` exchanges it for an `HttpOnly`,
`SameSite=Strict` session cookie. That cookie authorises the interface document
and its assets only — never the API.
