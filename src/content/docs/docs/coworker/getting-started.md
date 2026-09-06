---
title: "Getting started"
description: "Remit is a desktop app for macOS, Windows and Linux. Everything runs on your machine: the coworkers, the permission ladder that governs them, and the…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Remit is a desktop app for macOS, Windows and Linux. Everything runs on your machine: the
coworkers, the permission ladder that governs them, and the journal that records what they
did. Nothing leaves it except the model calls you configure and the connectors you
explicitly connect. There is no account to create.

## Install

Download Remit from [remit-ai.app/download](https://api.remit-ai.app/download). The page
lists the current version for each platform with its size and SHA-256 checksum.

- **macOS**, Apple silicon or Intel: open the disk image and drag Remit to Applications.
  The build is not yet notarized with Apple, so the first launch of a downloaded copy is
  refused by Gatekeeper: open it once from **System Settings ▸ Privacy & Security ▸ Open
  Anyway**. Updates the app installs for itself need none of this.
- **Windows**: run the installer. It is not yet signed with a code-signing certificate, so
  SmartScreen warns; choose **More info ▸ Run anyway**.
- **Linux**: the AppImage runs in place; the `.deb` installs on Debian and Ubuntu.

You will need an API key for at least one model provider, or a local model through Ollama,
or a gateway such as LiteLLM. Remit has no server of its own in the loop: model calls go
from your machine to the provider you chose.

## First run

![First-run setup asks where this machine belongs](/docs/images/first-run.png)

Setup opens the first time the app starts and asks one question before anything else:
**where does this machine belong?** The answer decides where sign-in goes and what setup
asks next. It decides nothing about protection; every floor holds in all three.

- **Just me.** No sign-in. Your keys, your machine. Setup goes on to who you are, a model,
  and the tools you connect with your own keys.
- **My team's gallery.** A [gallery your organisation runs](/docs/coworker/using-remit/#team-galleries).
  Type its address — whoever runs it will have sent you one, often as an invite link that
  fills it in — and Remit asks it what it is before anything is saved: whose gallery it
  found, how many coworkers it holds, and how signing in will go. Then sign in.
- **Remit Cloud Enterprise.** Sign in to your organisation on Remit Cloud. Its policy
  arrives with the sign-in, so the steps that follow already know what the organisation
  decided: a model step that says so when models are managed, one-click connections on
  the tools page.

Next comes who you are — name and email. It stays on this machine: nothing is sent
anywhere and Remit does not verify the address. It is there so the app can address you,
and so a gallery can credit coworkers you share to a person. When you signed in first, the
boxes arrive filled in.

You can skip any step. Everything local works without setup; only publishing a coworker to
a shared gallery needs an identity. **Settings ▸ General ▸ Run setup again** brings it back.

## Connect a model

![Settings, Models: providers and the models offered in the composer](/docs/images/settings-models.png)

**Settings ▸ Models** lists the providers. Add a key for the ones you already pay for —
Anthropic, OpenAI, Gemini, Amazon Bedrock, Vertex AI, a ChatGPT subscription through
Codex — or any OpenAI-compatible endpoint by name: DeepSeek, Fireworks, GLM, Grok, Kimi,
MiniMax, Mistral, OpenRouter, Qwen, Together. **Ollama** needs no key and runs models on
this machine. **LiteLLM (proxy)** points everything at one gateway.

Keys are stored in the secret store on your disk, owner-only, and never leave it. You may
configure several providers at once; the composer's picker offers the models you ticked,
and a session can switch model while it is idle.

## Connect your tools

![Settings, Connectors: connected ones first, then the rest](/docs/images/connectors.png)

**Settings ▸ Connectors** is where coworkers get their reach: GitHub, Slack, Jira, Linear,
Notion, Gmail and thirty more, plus any MCP server. Most need a key or one OAuth click.
Connected ones come first, with their status; each tool inside a connector has its own
switch once connected. **Slack is the exception** — it is your own Slack app, and
[the Slack page](/docs/coworker/connectors/slack/) has the scopes and event subscriptions the form
cannot fit.

Nothing has to be connected to start. A coworker with no connectors still reads and
writes files, runs commands you allow, and searches the web.

## Your first task

![The coworker picker in the composer](/docs/images/coworker-picker.png)

Press **New session** and pick a coworker from the chip in the composer. The general
**Coworker** takes any brief; the Security coworkers are specialists. Then ask for an
**outcome**, not a list of steps:

> Review the auth changes on this branch for vulnerabilities and prepare fixes.

![Where should this coworker work? A project folder or a temporary one](/docs/images/where-to-work.png)

A coworker that works on files asks **where**: a project folder you choose, or a temporary
folder Remit creates and deletes with the conversation. Folders that belong to no
conversation and hold nothing are cleared after a week; one that holds files is never
removed for you.

Remit plans, works, and comes back with the thing. The right-hand panel shows progress,
the files it produced, and the **Access** it has in this session — which connectors, which
folder, and how many actions it may take on its own.

## When it asks

Nothing consequential happens without a decision. The first time a coworker wants to write
a file, run a command or send something, you get a card that says what and why.

![A routine write in the workspace is one compact row](/docs/images/approval-write.png)

A routine write inside the project is a compact row: what file, a preview, **Allow** or
not. A command shows the command and says it stays on this computer.

![A message leaving the machine asks in every mode](/docs/images/approval-slack.png)

Anything that leaves your machine — a Slack message, a pull request, an email — says where
it is going. **Always allow** is scoped to the session unless you make it a standing rule
in Settings. The **mode** control in the composer sets how much gets asked, from *Discuss*
to *Auto-approve*; it never changes the floors, which are described in
[Using Remit](/docs/coworker/using-remit/#approvals-the-part-worth-understanding).

## Where things live

Everything is on this machine, in one directory: `~/.config/coworker` on macOS and Linux,
`%APPDATA%\coworker` on Windows. Sessions, memories, keys, the journal. The [configuration
page](/docs/coworker/configuration/#the-state-directory) lists every file.

## Updates

Remit checks for a new version every thirty minutes and at launch, and shows a banner when
one is ready; **Settings ▸ Check for updates** asks now. Every release is signed with a
key whose public half is compiled into the app, and the app verifies the signature before
it installs and relaunches. Under an organisation's policy, the organisation can hold a
release for its fleet. [How updates work](/docs/coworker/updates/) has the whole path.

## Without the desktop

The app runs the server for you. On a machine with no desktop, the same server runs on its
own; [Running the server directly](/docs/coworker/server/) covers that, the terminal worker, and the
command-line tools.

## Next

- [Using Remit](/docs/coworker/using-remit/) — coworkers, approvals, connectors, memory, automations
- [Security model](/docs/coworker/security/) — how governance actually works
- [Configuration](/docs/coworker/configuration/) — every setting, for when Settings is not enough
