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

## The plan, and what "done" means

A coworker keeps a plan — the task list it writes with `todo_write` — and can state
**done-when** criteria beside it: what a finished result must satisfy, specific and
checkable. Both are part of the session, not of the moment: they come back after a
restart, and they are in front of the coworker every turn, so a long session cannot
lose its own plan to context compaction.

The runtime holds the coworker to them. A turn that stops with plan items still
open, while nobody is watching, is sent back to finish or close them. A turn that
stops with done-when criteria stated is checked by a second model call, which
judges from the transcript's evidence only and names what is unmet; the coworker
gets one more go. Two rounds at most — then the turn ends and says the criteria
were not met, and a scheduled run records that as a failure rather than "ok".

A turn has a step limit (`max_iterations`). At the limit the coworker is asked, with
tools withheld, for a summary of what is done, what remains, and the next step. If
nobody is watching and the plan is still open, it wakes itself a few seconds later
and carries on — twice per brief, until a person speaks again. A coworker that
repeats one call and gets the same answer four times is refused the fourth and told
to wait with `wake_on` or `sleep_until` instead of polling; twelve tool errors in a
row end the turn as stuck.

## Coworkers

A **coworker** is a persona: a role with its own instructions, its own tools and
connectors, and its own default permission mode. Remit ships specialist Security
coworkers first, on the view that attackers already use AI and defenders should
have the same leverage, governed.

Pick one in the composer. The picker has a filter once the list outgrows
scanning by eye.

![The coworker picker in the composer](/docs/images/coworker-picker.png)

### Team galleries

Coworkers can come from a **gallery**. That is either Remit Cloud's curated one,
or a gallery your own organisation runs — a broker somebody there installed,
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

![Settings, Coworkers: the coworkers on this machine, and one opened](/docs/images/coworker-detail.png)

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

![A command the reviewer was not sure about: only a person can approve it](/docs/images/approval-unsure.png)

Your options are usually *approve once*, *always allow this*, or *reject*.
"Always allow this" is scoped to the session unless you make it a standing rule.
A session grant is kept with the session — across restarts, until you revoke it
or delete the session — and is listed in the rail under **Access ▸ Allowed in
this session**, with *Revoke* beside each. It is never honoured in Auto-Approve,
where the reviewer decides.

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

### When nobody answers

An automation or a headless run parks a card the same way a live session does,
and waits. It does not wait forever: after `approval_ttl` (a day by default,
[configuration](/docs/coworker/configuration/)) an unanswered card resolves itself as
**expired**, which counts as a decline. The run is told nobody answered — not
that a person refused — and told not to retry or ask again; it says what it left
undone and stops. A run holding a card no longer holds its engine open
indefinitely.

A reply from Slack or Telegram resolves a card only when it says so. For an
approval that means the one word — allow or deny — with the card's token; a
sentence that merely contains "yes" or "no" ("yes, I saw it, but hold off") is
not a decision, and the card stays open with a note asking for allow or deny. A
question still takes a typed answer, because that is what a question is for.

### Two floors you will meet in ordinary use

**After it reads something from outside.** A web page, an email, an issue or a
chat message can carry instructions aimed at your coworker, and nothing in a
model reliably separates those from yours. So once a turn has read one, anything
it does that leaves this machine — sending, posting, filing, fetching a URL —
comes to you, whatever mode you are in. The card says which read caused it.

You will see this most in connector work: read an issue, file a ticket. If a
destination is one you always use, list it in **Settings ▸ Security & trust ▸
Always-allowed destinations** and it stops asking — a host you named in advance
cannot have been chosen by something the turn just read. A card this floor
raises for a fetch offers exactly that: **Allow *host* from now on** writes the
entry for every session, and the session-only grant is not offered there,
because the floor would not honour it. An automation with a standing rule
pinned to one target is exempt for the same reason, and so is a Slack reply into
a channel you named under **Replies without asking** ([Slack](/docs/coworker/connectors/slack/#replying-without-asking)).
The card a Slack reply raises under this floor offers that too: **Reply in
*channel* without asking** names the channel and pins this session at once.

**Teaching a coworker.** A card for a call that names an exact target — file an
issue in *this* repository, create a ticket in *this* project, message *this*
address — offers **Allow every time against *target***. Press it and you have
taught a rule: every session, in every mode, will do that from then on without a
card, and it holds even after the coworker has read a page, because you named the
destination in advance. It is deterministic — no model judges it — and it is
listed under **Settings ▸ Security & trust ▸ Standing allowances**, with the
session that taught it and a Remove that takes effect at once. "Allow once" stays
once; teaching is the other button, and it says what it does.

A card never offers a grant the runtime would refuse. "Always allow" for a tool
is withheld from anything that acts outside this machine — a session-wide,
argument-unbounded grant would cover every future destination — so an
external-risk card shows once, deny, and whichever named allowance applies.

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

**Settings ▸ Connectors** — thirty-eight native integrations (GitHub, Slack,
Jira, Notion, Linear, HubSpot, Gmail and more), plus any MCP server.

![Settings, Connectors](/docs/images/connectors.png)

MCP servers can be added by hand, or from a built-in catalogue of vendor-published
ones. Anything added from the catalogue lands **disabled**: the catalogue makes a
server present, you make it live. Once connected, each server's tools have
individual switches, so you can allow a server while refusing specific tools.

A server you mark as not needing approval runs without cards, but its tools stay
what they are — calls to somebody else's code — so they are refused in Discuss
and Plan like a web fetch, and cannot be made "read" by an override.

Most connectors need only a key or an OAuth click. **Slack is the exception** —
it is your own Slack app, and the two tokens the form asks for are the smallest
part of the setup. See [Slack](/docs/coworker/connectors/slack/) for the scopes, the event
subscriptions, and what each symptom means.

### The browser

The nine `browser_*` tools drive a real browser on this machine: Chrome,
Chromium, Edge or Brave, whichever is installed. Remit never downloads one. If
none is found, the tools say so and name `browser_path`, the config key that
points at a binary somewhere else ([configuration](/docs/coworker/configuration/)).
**Settings ▸ Connectors ▸ Browser** shows which one was found.

Every session is a fresh profile, thrown away when it closes — never your own
browser, so nothing you are signed into is reachable from a conversation. On a
machine with a screen the window is visible while a coworker works in it; on a
server with none it runs headless.

Four things the session refuses on its own, whatever the mode:

- **Downloads.** A page that offers a file cannot land one on the machine through
  the browser; `web_fetch` and the connectors are the governed ways bytes arrive.
- **Local files.** The session cannot open `file:` URLs. The one exception is the
  separate, headless render `send_file` uses for an HTML screenshot, on a file
  you already scoped to a granted folder.
- **Private addresses.** Every request the page makes — not only the URL the
  coworker asked for, but each redirect hop and everything the page loads or
  fetches afterwards — passes the same address guard as `web_fetch`, and is
  failed if it may not go out. Loopback is allowed, because opening a dev server
  is what the tool is for.
- **Acting on what it read without asking.** Reading a page marks the turn as
  having read outside content; the clicks and form fills that follow are
  actions, and reach you first ([the two floors](#two-floors-you-will-meet-in-ordinary-use)).

## Models

**Settings ▸ Models**. Add a key per provider, run models locally through Ollama,
or point everything at one gateway with **LiteLLM (proxy)**.

![Settings, Models](/docs/images/settings-models.png)

You can switch a session's model mid-conversation, but only while it is idle —
a model cannot be swapped underneath a turn that is running. Stop it, or wait,
then switch.

**Model tiers.** Beneath the providers, two pickers: **Reviewer** and **Helper**.
The session's model does the work; these two do the jobs around it. The reviewer
judges each action in Auto-Approve and checks finished work against its
done-when criteria. The helper writes compaction summaries, titles sessions and
runs the read-only explorer subagents. *Automatic*, the default, is the cheapest
curated model of the same family as the session's — the picker shows which — so
it uses the same key and the same allowed list. Pin either to any model in the
list; a pin reaches sessions already open. The summarizer can still be pinned on
its own under Context optimization.

**A model the list does not know.** Add any id and it works: Remit infers what the
family carries, and both pickers say so — a badge in Settings, a second line under
the entry in the composer, *Unverified — capabilities inferred from its family* —
so you know they are inferred rather than checked. A verified row replaces both.

**Which provider a model is from.** Several providers can offer the same model —
Claude through Anthropic and through a gateway, an open model through Ollama and
through a vendor's API — and the picker says which is which. A verified model
carries its provider in its name: *Claude Opus 5 · Anthropic*, *GLM-5.2 · via
Fireworks*. A model you added yourself is shown as its id and the provider it
routes to: *gemma4:31b-cloud · Ollama*, *claude-opus-5 · LiteLLM*. An id with no
provider at all is OpenAI's, because that is where a bare id goes, and it is named
so. The same wording is in the session's subtitle once it has history, in the
token chip, and on every row under **Settings ▸ Models ▸ In the composer's
picker**, where the full id is a hover away. Underneath, every id is stored as
`provider:model`; the audit trail records the provider that answered each call
whatever the picker showed.

**Refusals.** Some providers' safety filters decline a request outright — the
public GPT-6 Astra declines cybersecurity prompts, for one. A declined request
fails with a message saying so and what to do, rather than as an empty reply.
For the Security coworkers, pick a model that will do defensive work: their
recommended list names Claude Fable 5.1 and Opus 5 first.

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
  grouped by who it is about: "About you" first, then each project, then each
  coworker's own, then each team's.

  ![Settings, Memory](/docs/images/settings-memory.png)
- Each save is announced in the conversation with one-tap **Undo**.
- **Ask me before saving** routes every save through an approval card. Off by
  default.
- **What this costs** tells you how many memories your coworkers are actually
  given per conversation, and roughly what that costs in tokens. Past a ceiling
  the oldest stop being sent — they stay saved and listed, and deleting ones you
  no longer need brings the others back into view.
- **Your instructions** is a separate box: standing rules you write yourself.
  They outrank anything the coworker learned, and no tool can edit them.

**Who a memory is about.** Four kinds, and Settings groups them. *About you* applies
everywhere. A *project's* memories apply to work in that folder, whichever coworker
is doing it. *With a coworker* is what that one coworker has learned — how you like to
work with it, what its own job taught it — in every project. A *team's* memories
belong to a board space and reach every member, and a team's journal **decisions**
land there as they are written, so the next member to start knows what was decided
without being told. The coworker chooses the scope when it saves and says which; you
can move nothing between scopes, only delete and let it be saved again.

**Finding a memory.** Everything a coworker knows is given to it at the start of a
conversation, so it rarely needs to look. Past the ceiling, older memories are listed
by summary only, and a coworker can search the rest by keyword with `memory_search`
before acting — no embeddings, no ranking, a word match over what it is allowed to
see.

## Skills and automations

**Skills** are loadable capabilities a coworker can pick up mid-task. A coworker
can also propose saving a finished skill, which routes through the normal
approval card.

**Automations** run a coworker on a schedule — a Monday digest, a nightly triage.
They live in **Automations** in the sidebar. A coworker can propose one; the proposal
is an approval card that lists exactly what the automation would be allowed to do,
target by target. Each schedule fires once, whichever Remit is running — the
desktop app and a server you started by hand can share one state directory
without both running the same morning's briefing.

![Automations, with their runs](/docs/images/automations.png)

A run that did not finish — the model failed, a tool crashed, or the turn ran into
its iteration cap with the work undone — is marked **failed** in the run list, with
the reason, and a completion notice says so rather than reading like a success.

**One retry, when the failure was the runtime's.** A scheduled run that failed
because the model or its provider failed, the response stalled, or a tool crashed
is run once more ten minutes later (`run_retry_after`; `0` switches it off). The
run list shows it as *retry*, the automation's status line says *retry at 08:14*
while it is pending, and the notice for the failed run says a retry is coming.
It is bounded on purpose: never a run cut off at the iteration cap, never one
whose done-when criteria were not met, never an interrupted one, never a manual
run — a person is watching those — and never a second retry. A retry is skipped
when a run of the same automation is still going, and not scheduled at all when
the next scheduled run is sooner than the delay, because that run is the retry.

**What a run does on its own, and what it asks.** A run writes files inside its
workspace without asking, and does anything the automation was granted in
advance: a message to one pinned channel, a fetch of a named site, its web
searches. Everything else parks a card — in the run's conversation when you have
it open, in the **Inbox** when you do not — and the run waits. To stop a card
coming back tomorrow, answer it with **Allow every time**: that pins the exact
target for this automation, and it is revocable on the automation's page. The
templates declare what they will need, so the first run is the one that runs.
Opening a run to answer a card does not change what it may do on its own.

**Which model a run uses.** By default an automation follows the default model
under Settings ▸ Models, so changing the default changes every automation that has
not been pinned. To pin one, pick a model under **Model** on the automation's page;
it saves as you choose, and the first entry, *Default*, names what the default
resolves to today so you can see what you are moving away from. The list is the
composer's, with providers named the same way, so a gateway's copy of a model and
the vendor's own are two different rows. A model your organisation's policy
forbids is greyed with the reason and cannot be pinned. A pinned model whose
provider is later disconnected fails the run with a clear error rather than
quietly switching to another, which is the right behaviour for something that
runs while nobody is watching. The reviewer and helper for a run follow the run's
model, so a pinned automation gets a reviewer of the same family.

**Allowed without asking** folds once it grows. Every *Allow every time* adds a
row, so a briefing that visits a new site each morning has a long list within a
month. The heading carries the count; three rows or fewer stay open, more start
closed, and the list opens on a click with *Revoke* beside each rule as before.

**What a run delivered.** Under each run: chips for the files it wrote, titled by the
name the coworker gave them and hashed so a later edit is detectable, and a line for
each message it sent and where. `GET /v1/digest?since=` returns the same for every
run since a time, with the board items teams moved to done, and a text rendering
you can send anywhere — what happened while you were away, in one call.

**Runs** shows the latest six. An automation that runs daily has a long history
within weeks, so the page keeps the newest few on screen and folds the rest
behind *Show all N runs*; a run is the record of what happened and is never
dropped from the page, only folded. If an unseen run sits behind the fold the
link says how many are new. The server keeps the last fifty.

A run is not one turn. It can put itself to sleep and wake later (`sleep_until`),
wait for a job it backgrounded to finish (`wake_on`), or wait for the next message
on a channel (`wake_on_event`), and a coworker with a team role works the board and
its team from a scheduled run exactly as it would from a conversation — filing
items, staffing a team, steering a worker. What it cannot do from a run is create
another automation.

Approvals and questions from unattended runs land in the **Inbox**, reached from the
account menu at the foot of the sidebar; the badge on it counts what needs you. An
automation clears ordinary local writes on its own; anything the ladder reserves
for a person — a git hook, a CI file — waits there too.

![The Inbox: what unattended runs need from you](/docs/images/inbox.png)

## The board

The board is a work-item board with a hash-chained journal. Leads plan and staff it;
workers claim items off it, act inside the remit granted, and answer for what they did.
A session is bound to a board from the composer's **Attach ▸ Board** menu, and a
coworker can work the board as a tool, because it also runs as an MCP server.

Staffing a team and filing a plan as work items are decisions: each is an approval
card, in the conversation when you are there and in the **Inbox** when you are not,
so a lead that wakes at night can still ask. Teammates reach each other with
`post_chat` when team chat is on, and a lead can steer one worker directly with
`steer_worker`; `team_options` lists who can be staffed.

## Without the desktop

The app runs the local server for you. On a machine with no desktop, the same server
runs on its own, and the terminal worker, the connector tool and the board CLI are
there for people who live in a terminal: [Running the server directly](/docs/coworker/server/).

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
