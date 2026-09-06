---
title: "Getting started"
description: "Remit runs entirely on your machine. Nothing leaves it except the model calls you configure and the connectors you explicitly connect."
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Remit runs entirely on your machine. Nothing leaves it except the model calls
you configure and the connectors you explicitly connect.

## Install

Download Remit for macOS, Windows or Linux from remit-ai.app/download. The app
includes the local server and the interface; nothing else is needed. You will want an API key
for at least one model provider, or a local or proxy endpoint, which setup asks for on first run.

The desktop app runs the local server for you. The command-line notes below are for people
running the server directly, for example on a machine without a desktop.

## Start the server

```bash
./bin/remit-server --cwd ~/code/my-project --open
```

`--open` launches the interface in your browser. Without it, the server prints a
URL carrying a one-time token.

The server binds `127.0.0.1:8765` by default and is **not** reachable from other
machines. Every request needs a token, which is written to
`~/.config/coworker/sidecar-<port>.token`. See
[configuration](/docs/coworker/configuration/) for changing the host, port and state
directory.

## First run

Setup opens the first time the interface loads and asks one question before
anything else: **where does this machine belong?** Three answers, and the answer
decides where sign-in goes and what setup asks next. It decides nothing about
protection — every floor holds in all three.

- **Just me.** No sign-in. Your keys, your machine. Setup goes on to who you
  are, a model, and the tools you connect with your own keys.
- **My team's gallery.** A [gallery your organisation runs](/docs/coworker/using-remit/#team-galleries).
  Type its address — whoever runs it will have sent you one, often as an
  invite link that fills it in for you — and Remit asks it what it is before
  anything is saved: it says whose gallery it found, how many
  coworkers it holds, and whether signing in opens your identity provider or
  needs no password at all. Then sign in. The gallery's endpoints are filled in
  from that one address; the five fields under **Settings ▸ Cloud** are still
  there if you ever need them.
- **Remit Cloud Enterprise.** Sign in to your organisation on Remit Cloud. Its
  policy arrives with the sign-in, so the steps that follow already know what
  the organisation decided: a model step that says so when models are managed,
  or skips itself when the organisation provides model access; one-click
  connections on the tools page.

A machine already under an organisation's policy, or one whose configuration
already names a gallery, starts on the right card. Under a policy the choice is
locked and says whose it is — the lock is honesty, not enforcement; policy binds
whatever card is showing.

Next comes who you are — name, surname and email. It stays on this machine:
nothing is sent anywhere, no mail is generated, and Remit does not verify the
address. It is there so the app can address you, and so a gallery can credit
coworkers you share to a person rather than to the machine. When you signed in
first and the gallery asserted a real person, the boxes arrive filled in for
you to confirm or correct.

You can skip setup at any step. Everything local works without it; only
publishing a coworker to a shared gallery needs an identity. Change any of it
later in **Settings** — **Settings ▸ General** offers "Run setup again".

## Connect a model

Remit ships with no model configured, so setup asks for a provider next. Either
set an environment variable before starting the server:

```bash
export ANTHROPIC_API_KEY=...
```

…or add the key in **Settings ▸ Models**, which stores it in
`~/.config/coworker/secrets.json` with owner-only permissions.

Remit speaks to Anthropic, OpenAI (both the chat and responses APIs), Gemini,
Bedrock, Vertex and Codex directly, plus any OpenAI-compatible endpoint —
DeepSeek, Fireworks, GLM, Grok/xAI, Kimi, MiniMax, Mistral, Ollama, OpenRouter,
Qwen and Together are recognised by name. To route everything through one
gateway such as LiteLLM, set `model_proxy_url` in `config.toml`.

## Your first task

Ask for an **outcome**, not a list of steps:

> Review the auth changes on this branch for vulnerabilities and prepare fixes.

Remit plans, works, and asks before doing anything consequential. The first time
it wants to write a file or run a command you get an approval card explaining
what and why. Nothing consequential happens without one — see
[security](/docs/coworker/security/) for exactly what "consequential" means.

## Where things live

State lives in `~/.config/coworker` (the directory name predates the rename and
is kept so existing installs keep working):

```
config.toml          your settings
prefs.json           interface preferences and your local identity
secrets.json         API keys, owner-only
coworker.db          memories, sessions, chat history
journal.db           the hash-chained audit journal
sidecar-<port>.token the local API token
```

## Next

- [Using Remit](/docs/coworker/using-remit/) — coworkers, approvals, connectors, memory
- [Configuration](/docs/coworker/configuration/) — every setting
- [Security model](/docs/coworker/security/) — how governance actually works
