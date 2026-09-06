---
title: "Using Remit"
description: "Remit is built to deliver finished work. The brief that works is the one you would give a colleague:"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

## Ask for an outcome, not a task list

Remit is built to deliver finished work. The brief that works is the one you
would give a colleague:

> Review the auth changes on this branch for vulnerabilities and prepare fixes.

not

> Open auth.go, then grep for validate, then...

It plans, works, and comes back with the thing — reviewed code with fixes ready,
a triaged inbox, a Slack reply with the numbers in it.

## Coworkers

A **coworker** is a persona: a role with its own instructions, its own tools and
connectors, and its own default permission mode. Remit ships specialist Security
coworkers first, on the view that attackers already use AI and defenders should
have the same leverage, governed.

Pick one in the composer. The picker has a filter once the list outgrows
scanning by eye.

### Team galleries

Coworkers can come from a **gallery**. That is either Remit Cloud's curated one,
or a gallery your own organisation runs — a
broker somebody there installed,
holding coworkers your colleagues wrote. The sections below apply to both, and
say which when it matters.

The short version of a team gallery: you sign in to it, install from it, and if
you have built something worth sharing you publish it — where somebody reads it
before anyone else can install it. Nothing lands on your machine without the
usual consent, whoever wrote it.

Joining one is one address. Whoever runs the gallery sends you its URL — usually
as an **invite link**, `remit://join?gallery=…`, which opens Remit with the
address already filled in. First-run setup (or the Join dialog, once you are set
up) asks the gallery what it is, tells you whose it found and how signing in
will go, and signs you in. There are no other fields to fill.

An invite link does exactly that much and no more. It never signs you in, never
saves anything, and does not even check the address on its own: it fills the
box, and you press Check, read what was found, and choose to sign in. A link in
an email is somebody else's words, and Remit treats it that way. On a machine
under an organisation's policy the link does nothing, and says so.

Coworkers installed from a gallery arrive the same way as any other: through the
same parser, with the same install-time consent, disabled until you approve
them. One that carries its own skills is transferred as a single archive whose
hash Remit verifies before unpacking — so what installs is what the author
published, skills included, or nothing at all.

### If your gallery asks for a code

Some team galleries require a one-time code as part of signing in. Remit asks
for it right after you sign in, and until you enter it the gallery stays closed
— a new code each time you sign in, expiring shortly.

Where the code comes from depends on how your gallery is set up. Usually it is
emailed. If the gallery has no mail server configured, Remit says so plainly and
whoever runs it has the code — it will not tell you to check an inbox nothing
was sent to.

### Keeping one up to date

A coworker installed from a gallery remembers where it came from, so **Settings ▸
Coworkers** badges the ones with something published beyond what you have —
*Update* when a newer version can be established, *Changed* when it cannot — and
the coworker's own page explains it and carries the button. Updating runs the ordinary
install: if the new version asks for **more** than the one you approved, it
lands disabled pending a fresh decision; if it does not, it keeps working as it
was. Nothing updates on its own — applying somebody else's new prompt and skills
to a coworker you already trusted should be a decision, not a background task.

Versions come from the gallery, not from whoever wrote the coworker: v1 when it
is first published, v2 at the next approved update, and so on. So "v3 is newer
than v2" is always true, and you do not have to reason about somebody's private
numbering scheme.

Against a gallery that does not assign versions — an older one, or a coworker
placed on disk by hand — the numbers may be unorderable ("2" against "1.2.0").
The page then says the copy has **changed** rather than claiming it is newer.

One more limit: if you have edited the coworker since installing it, you are told
before you update. Updating replaces it, and there is no merge.

Coworkers installed before this shipped have no record of their origin and never
report updates. Re-installing one from the gallery starts the record.

Gallery cards show how many people have installed each coworker. It is a count
and nothing else — a self-hosted gallery deliberately keeps no record of *who*
installed what.

### Reviewing what your team publishes

If your gallery's operators include you, **Settings ▸ Coworkers** grows a
**Review queue**: coworkers your colleagues have published, waiting for someone
to look at them. Nobody else sees the section — whether you may review is your
gallery's decision, and Remit asks rather than assuming.

Open one and you get its manifest and every skill in full, because that is the
point. Approving puts a coworker in everyone's gallery, and its skills run on
the machine of whoever installs it. Approve publishes it immediately; rejecting
asks for a reason, which is recorded and is what the person who uploaded it has
to work from.

### Sharing one with your team

If your organisation runs its own gallery, a coworker you built can be published
to it from **Settings ▸ Coworkers ▸ (the coworker) ▸ Publish to your team**.

Before it sends anything, Remit shows the exact files that will go — including
how many skills, because skills are behaviour and will run on the machine of
everyone who installs it. What comes back is **"waiting for review"**, not
"published": an operator approves it before anyone else can see it.

It is offered only when it can work — against a team gallery, signed in, with
your name and email set, and only if that gallery is accepting uploads at all
(its operator turns that on). Otherwise Remit says which of those is missing
instead of showing a button that would fail.

There is deliberately **no tool for this**: publishing pushes durable state to a
shared machine other people install from, so it takes a person clicking it.
Remit Cloud's own gallery is curated and does not accept uploads.

### Creating your own

**Settings ▸ Coworkers ▸ Create** authors one locally: name, instructions, the
tools and connectors it may use, recommended models, default mode. The form
posts fields, never YAML — the server renders the manifest and installs it
through the same parser and the same consent path as any other install, so an
authored coworker lands disabled until you approve what it can reach.

Publishing to a shared gallery is a later phase.

Before you enable one, **Read its instructions** on the consent card shows the
prompt it runs on and any skills it brings. The list above it is what the
coworker *may* do; this is what it is *told* to do. Worth a minute for anything
that arrived from somebody else.

## Approvals: the part worth understanding

The first time a coworker wants to do something consequential you get an
approval card: what it wants to do, and why.

Your options are usually *approve once*, *always allow this*, or *reject*.
"Always allow this" is scoped to the session unless you make it a standing rule.

The **mode** control sets how much gets asked:

| Mode | Use it when |
|---|---|
| Discuss | you want to talk, not change anything |
| Plan | you want a plan proposed before any work |
| Interactive | the default — consequential actions ask |
| Custom | you have a few tools you are happy to auto-allow |
| Auto-approve | you want a reviewer to judge instead of you |

Modes change what gets *asked*. They never change the hard floors — Remit will
not modify its own settings, will not write outside a writable root, and will
not grant itself authority that outlives the session. See
[security](/docs/coworker/security/).

### Two floors you will meet in ordinary use

**After it reads something from outside.** A web page, an email, an issue or a
chat message can carry instructions aimed at your coworker, and nothing in a
model reliably separates those from yours. So once a turn has read one, anything
it does that leaves this machine — sending, posting, filing, fetching a URL —
comes to you, whatever mode you are in. The card says which read caused it.

You will see this most in connector work: read an issue, file a ticket. If a
destination is one you always use, list it in **Settings ▸ Security & trust ▸
Always-allowed destinations** and it stops asking — a host you named in advance
cannot have been chosen by something the turn just read. An automation with a
standing rule pinned to one target is exempt for the same reason.

**After it has done enough.** A turn takes a set number of off-machine actions on
its own — 50 by default — and then the rest come to you, with a note in the
transcript saying so. It never blocks: you decide, and an approval runs.

The right number depends on what a session is for. Five sends is odd for a coding
session and unremarkable for an inbox triage, so the default lives in
**Settings ▸ Security & trust** and any session can carry its own in its
**Access** panel. Leave the session box blank to follow the default.

Neither can be switched off from inside a conversation, and neither is cleared by
"always allow" — those grants make an action *allowed*, which is exactly what
these two catch.

## Connectors

**Settings ▸ Connectors** — 25+ native integrations (GitHub, Slack, Jira,
Notion, Linear, HubSpot, Gmail and more), plus any MCP server.

MCP servers can be added by hand, or from a built-in catalogue of vendor-published
ones. Anything added from the catalogue lands **disabled**: the catalogue makes a
server present, you make it live. Once connected, each server's tools have
individual switches, so you can allow a server while refusing specific tools.

Most connectors need only a key or an OAuth click. **Slack is the exception** —
it is your own Slack app, and the two tokens the form asks for are the smallest
part of the setup. See [Slack](/docs/coworker/connectors/slack/) for the scopes, the event
subscriptions, and what each symptom means.

## Models

**Settings ▸ Models**. Add a key per provider, or point everything at one
gateway with `model_proxy_url`.

You can switch a session's model mid-conversation, but only while it is idle —
a model cannot be swapped underneath a turn that is running. Stop it, or wait,
then switch.

Under an organisation's policy the pickers may show some models greyed, with
"Not allowed by *Acme*'s policy" beside them. They stay in the list so you can
see the picker is whole; they cannot be picked, and a provider none of the
policy's patterns names is greyed as a card. The greying is a courtesy, not the
control: the runtime refuses a forbidden model at the first call whatever a
picker shows, with the same reason.

## Memory

Coworkers remember durable things about you between conversations — corrections,
preferences, project context that could not be rederived from the code.

- Everything remembered is listed in **Settings ▸ Memory**, in plain language,
  grouped by project. Global memories ("About you") apply everywhere.
- Each save is announced in the conversation with one-tap **Undo**.
- **Ask me before saving** routes every save through an approval card. Off by
  default.
- **What this costs** tells you how many memories your coworkers are actually
  given per conversation, and roughly what that costs in tokens. Past a ceiling
  the oldest stop being sent — they stay saved and listed, and deleting ones you
  no longer need brings the others back into view.
- **Your instructions** is a separate box: standing rules you write yourself.
  They outrank anything the coworker learned, and no tool can edit them.

## Skills and automations

**Skills** are loadable capabilities a coworker can pick up mid-task. A coworker
can also propose saving a finished skill, which routes through the normal
approval card.

**Automations** run a coworker on a schedule — a Monday digest, a nightly triage.
They live in **Automations** in the sidebar.

## The board

`remit-board` is a work-item board with a hash-chained journal. Coworkers claim
items off it, act inside the remit granted, and answer for what they did.

```bash
./bin/remit-board board --help
./bin/remit-board journal --help
```

It also runs as an MCP server, so a coworker can work the board as a tool.

## The other binaries

```bash
./bin/remit --cwd ~/code/project        # terminal worker (TUI)
./bin/remit-connectors status           # connector diagnostics
./bin/remit-board board list            # the board
```

`remit` takes `--model`, `--mode`, `--resume <session-id>` and an optional skill
to launch.

## Where your data lives

Everything is local, in `~/.config/coworker` — see
[configuration](/docs/coworker/configuration/#the-state-directory). Nothing leaves your
machine except the model calls you configure and the connectors you connect.

A session you start without a project folder works in a temporary folder under
`~/Remit`. Deleting the conversation deletes the folder. Folders that belong to no
conversation, hold nothing and have sat untouched for a week are cleared at the next
start; one that holds files is
never removed for you — it is named in the server log instead. See
[temporary folders](/docs/coworker/configuration/#temporary-folders).
