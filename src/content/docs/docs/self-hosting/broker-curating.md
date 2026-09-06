---
title: "Curating a broker gallery"
description: "For whoever writes and shares coworkers. Deployment, TLS and auth modes are in README.md; the mechanics of review are in docs/sharing.md."
---

<p class="rm-synced">Part of the remit-broker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

For whoever writes and shares coworkers. Deployment, TLS and auth modes are in
[README.md](/docs/self-hosting/broker/); the mechanics of review are in
[docs/sharing.md](/docs/self-hosting/broker-sharing/).

## What this is for

A coworker (persona) is a role definition: a prompt, a set of tools, a working
style, and sometimes skills. Without a gallery, sharing one means passing files
around. With one, your team browses an internal catalogue and installs with a
click.

The gallery holds **coworker definitions only**. Nobody's conversations, keys or
files go near it — those stay on each person's machine.

## Writing one

YAML frontmatter, then a markdown pitch. The frontmatter is the contract:

```yaml
---
id: appsec-reviewer            # the slug; must be unique in the gallery
name: AppSec Reviewer          # shown on the card
icon: shield
group: security
tagline: Reviews changes for exploitable bugs, with the fix attached
description: A security reviewer for pull requests and working-tree diffs…
tools: [code_files, git, search, shell, todo]
connectors: [github]
recommended_models: [anthropic:claude-opus-4-8]
default_permission_mode: interactive
requires_folder: true
publisher: Platform Security   # the label on the card
pitch: |
  ## What it does
  …markdown shown on the detail page…
---

You are the AppSec Reviewer. …the system prompt, which is the coworker…
```

Copy one of the files in `personas/` and edit it.

`tools` and `connectors` are shown to whoever installs it, before they enable
it. Ask for what the role needs and nothing more — a coworker requesting the
shell and every connector will be read as one that might do anything, because it
might.

**Do not bother with `version`.** A gallery assigns its own: v1 when your
coworker is first published, v2 at the next approved update. Whatever you write
stays in your manifest and is ignored on the card. (A coworker an operator
copies onto the server by hand keeps the version you wrote — there was no
approval to count.)

## Coworkers with skills

Give it a directory of its own and the skills travel with it:

```
my-coworker/
  manifest.md
  skills/
    how-we-triage.md
```

The gallery serves that as a single archive; installing it lands the skills
alongside the prompt, and the installing app verifies the archive's hash before
unpacking. A lone `my-coworker.md` cannot carry skills — it has no folder to put
them in.

Two consequences worth knowing:

- **Skills run on other people's machines.** They are behaviour, not
  documentation. Whoever reviews your upload will read them closely, and so will
  anyone careful at install time.
- **People on an older Remit will not see it.** Their build would install it
  without the skills and report success, so the gallery hides it from them
  rather than handing them something broken. A coworker that is only a prompt
  stays visible to everyone.

## Sharing it

**From the app**, if your gallery accepts contributions: Settings ▸ Coworkers ▸
your coworker ▸ **Publish to your team**. Remit shows exactly which files will be
sent before it sends them.

You need a name and email set first (Settings ▸ General ▸ You) — a coworker is
published *by a person*, and replacing or removing it later needs the same
address. Nobody else can take your id: an upload of something you already
published is a conflict, not a replacement.

**By hand**, if you are also the one running the broker:

```bash
cp -r my-coworker /srv/remit-personas/
kill -HUP $(pgrep -f remit-broker)
```

That publishes immediately, with no review — which is the difference between the
two routes, and the reason the app's route exists.

## What happens after you publish

It is **queued, not published**. Whoever runs the gallery reads the manifest and
every skill, then approves or rejects it. A rejection comes with a reason.

Two things follow:

- Write the description and pitch for somebody who has never seen your coworker
  and is deciding whether to trust it.
- Expect the skills to be read line by line.

Once approved it appears in everyone's gallery, and its card shows how many times
it has been installed. Installs, not people: an update counts again, and the
gallery keeps no record of *who* — so it cannot tell them apart.

## What your team sees

Signed in, the **Gallery** appears in their account menu. Installing copies your
coworker locally and lands it **disabled**: they see its tools, connectors and
risk classes, can read its instructions and skills, and then decide.

That is deliberate. A shared coworker should never become active on somebody's
machine without them having looked at it.

## Updating one

Publish again. It goes back through review, and on approval the gallery's version
advances — v1, v2, v3. People who installed it are told there is a newer one and
choose whether to take it; nothing updates by itself.

If the new version asks for **more** than the old one — a tool or connector it
did not have — it lands disabled again pending a fresh decision, even for people
who had already enabled it. Growing what a coworker can reach is a new question,
not a detail.

## Keeping it healthy

- **Removing one** — from the app if you published it, or delete the directory
  and `kill -HUP`. Anyone who already installed it keeps their local copy: a
  gallery is a catalogue, not a leash.
- **Who can see it** — in the default `none` auth mode, anyone who can reach the
  broker can read the gallery. Keep it on an internal network, or use `oidc` and
  let your identity provider decide ([docs/auth.md](/docs/self-hosting/broker-auth/)).
- **What is never shared** — conversations, credentials, files, or anything from
  the machine you wrote it on. A coworker is its manifest and its skills.
