---
title: "The administration console"
description: "A browser surface at /console, served by remit-cloud itself. Registering an organisation, writing its policy, inviting its people, and reading its…"
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

A browser surface at `/console`, served by `remit-cloud` itself. Registering an
organisation, writing its policy, inviting its people, and reading its fleet and its
record — all the things the API does, for the people who will not be using curl.

It is a separate surface from the coworker on purpose. **The coworker is the subject of a
policy; this is where the policy is issued.** The people who write one are often security
or IT operators who never install the coworker at all, and every free build would otherwise
ship the whole administrative surface for a service most people never touch.

## How a browser signs in

The console runs the ordinary authorization-code flow with PKCE against **this
deployment's own** `/authorize` and `/oauth/token`, so it works identically whether those
are served by the self-issuing mode or proxied to a real identity provider.

What it does differently is what happens next. Instead of keeping the access token in
JavaScript for the working day, it hands it to `POST /console/session` once and forgets it.
The server validates it exactly as it validates any bearer, keeps it in memory, and answers
with an **httpOnly** cookie. So:

- The long-lived credential is not reachable from script, and an injected string cannot
  read it.
- Every write additionally carries `X-Remit-CSRF`, echoed from a second, deliberately
  readable cookie. Another site can make a browser send a cookie; it cannot make it read
  one.
- Sessions are per process and expire with the token they hold, capped at twelve hours. A
  restart signs administrators out, which is honest for a server that also holds its
  self-issued sessions in memory — and it means a stolen database is not a stolen console.
- The content policy allows nothing but this origin: no inline script, no third-party
  anything, no framing. That is why the console is external modules rather than one HTML
  file with a script block.

A self-asserting deployment that requires a sign-in code takes the code on the console's
own gate, the way the coworker does. Behind an identity provider the address is confirmed
there, and the gate can only send people back to it.

**With a real identity provider, add the console's callback to its allowlist:**
`https://<your-cloud>/console/callback`, beside the coworker's `/v1/auth/callback`.

`auth.oidc.proxy_endpoints = false` points clients straight at the provider and mounts no
authorize endpoint here, so the console cannot sign anyone in. It says so on its sign-in
page rather than offering a button that leads to a 404.

## Appearance

Light by default, whatever the operating system prefers. **Appearance** at the foot of the
rail offers Dark, or System to follow the machine; the choice is kept in that browser and
applied before the first paint.

## The policy editor

Generated from the server's own lattice (`GET /v1/admin/policy/lattice`), not from a copy
of the key table in the page. A key added to the lattice appears in the editor — with its
title, what it does, and what it does on the machine — with no change to the console, and
the two can never disagree about a shape. Everything the page says about a key comes from the server's own definition of the key: the title a person reads, the description that says what the rule is,
and the effect that says what a coworker does when it bites, written from the runtime's
own enforcement rather than from the spec.

The page is organised around what an administrator arrives knowing — *what they want to
stop* — rather than around key names:

- **Scope tabs.** The organisation's document, and one tab per group that has a document,
  a machine reporting it, or a break-glass window. A group nobody has touched yet is added
  by name; it is whatever the identity provider calls it.
- **Starting points.** A few named sets of rules — keep a person in the loop, approved
  connectors only, signed coworkers from known sources, every model call through one
  gateway — that fill the draft in one click and never touch a rule already applied.
  Nothing is issued by adding one.
- **Rules, by the part of a coworker they reach.** Each card is titled by what it does,
  carries its wire name underneath, and says in a chip which state it is in right now:
  *Not applied*, *3 allowed*, *Allows nothing*, *At most 8*, *On*. Opening a card shows what
  the rule does, what it does on the machine, and the editor its shape calls for: the
  permission ladder in autonomy order, connectors and tools to tick, small forms for MCP
  servers, skills and coworkers rather than JSON per line, and coworkers offered from the
  fleet's own inventory. A rule that has caused refusals in the last thirty days says how
  many.
- **What a person will see.** A panel beside the rules, derived from the draft, in the
  coworker's own words: the mode menu with forbidden modes struck out, the Inbox switch,
  the budget, which connectors are on offer, what is sent back — and the exact sentence a
  refusal will read, with the organisation's support contact in it, or a note that none is
  set.
- **Review before issuing.** The difference from the issued version, and — when a rule is
  being added that some machine in scope has said it does not understand — which machines
  will refuse the whole document, and why that drops every other rule on them too. A
  machine that has not said which rules it understands is counted separately as "cannot
  tell", never rounded either way.
- **What coworkers send back**, and **if a machine loses contact**: the evidence and
  heartbeat opt-ins in the same card style; the check-in and stale windows in minutes and
  days; and the stale rules (`on_stale`) edited with the same cards. Re-issuing carries the
  current windows rather than resetting them.
- **Review before issuing.** The difference from the current version — added, removed and
  changed rules with their values, reporting toggles, timing — and only then "Issue version
  N". Nothing changed is a state the page says, not a version it signs.
- **Every version**, with what changed against the previous version of the same scope,
  and **break-glass**, which lives here because what it suspends is a group's document.

The distinction the screen exists to make unmissable: **a rule that is not applied is no
constraint, and an allowlist that is applied and empty allows nothing.** Opposite meanings,
one click apart. So every rule has an explicit switch, an unapplied rule is omitted from the
document rather than sent as empty, and an empty allowlist says so in a warning that is
there only while it is true.

A refused draft is refused **whole**, and the console says exactly that — "Refused, and
nothing changed" — because a partial application is what an administrator would otherwise
assume.

## The screens

**Policy** is the editor above, with break-glass. **People** is members and invitations.
It says up front whether this deployment emails the people it invites, and where it does
not it shows the invite link to hand them — before the first invitation, and again beside
each one — because that link is the whole of what an operator without a mail server has to
pass along. Admins move people between admin and member; who the owners are is the owners'
call, in both directions. **Coworker Gallery** is the review queue — the manifest and every
skill in full, with the scan's findings beside them — then what the gallery serves this
organisation, so an administrator can see what their people are offered without installing
it, plus the update hold, which acts on a whole fleet at once and is on the policy chain. **Fleet** is which build, which policy and which coworkers are on each
machine, and how many rules people have taught coworkers there — a count, never the rules. **Record** is the content-free evidence. **Organisation** is the name, the contact
a refusal sends people to, and what the plan covers.

## What it does not do

No console can lower a protection. Everything here composes by intersection and may only
tighten; the refusal lives at the endpoint, not in this page. A console that could widen a
permission would be a console worth attacking.
