---
title: "How Remit updates itself"
description: "How a new build reaches every desktop — free, self-hosted broker or Cloud Enterprise — and how Remit Cloud deploys itself. What happens, in what order,…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

How a new build reaches every desktop — free, self-hosted broker or Cloud Enterprise — and
how Remit Cloud deploys itself. What happens, in what order, who approves it, and what each
key is for. releasing.md is the procedure; this page is the explanation.

## The short version

Every desktop asks Remit Cloud twice an hour whether a newer version exists. If one does,
the app downloads it in the background, checks that it was signed with Remit's release
key, and shows a small card: *Update available · Restart to update*. Nothing installs until
the person clicks. If a coworker is in the middle of a turn, the button waits.

A release is made by pushing a git tag. GitHub builds the app for every platform, signs
it, uploads it to the download host, and publishes it first to your own organisation as a
canary. When you have used it, you run a second, manual workflow that publishes it to
everyone. Each step verifies the last one the way a desktop would.

Remit Cloud, the server, deploys the same way: a tag builds it and hands it to the box
through a key that can do exactly one thing — install and restart — rolling back if the
service does not come up.

## The pieces

Ten things, each with one job. The rest of this page is how they fit.

| Piece | What it is | Where it lives |
|---|---|---|
| Desktop shell | The app window. Holds the updater and the public key it trusts. | On each machine (Tauri) |
| Runtime (sidecar) | `remit-server`, the coworker engine. Ships inside the app, so an app update is a runtime update. | Inside the app bundle |
| Manifest | A small JSON file: the newest version, its notes, and per-platform download URL and signature. | `api.remit-ai.app/desktop/latest.json` |
| Channels | The public channel everyone reads, and one channel per organisation for canaries. An organisation can hold updates. | Remit Cloud's database |
| Release key | A minisign key pair. The private half signs each build; the public half is compiled into the app. | GitHub environment `release` |
| Download host | Where the signed builds sit, on paths that are never overwritten. | Cloudflare R2 behind `downloads.remit-ai.app` |
| Release workflow | Builds, signs, uploads, publishes and verifies, from a tag. | `.github/workflows/release.yml` in this repository |
| Publish token | The only credential that may add a release to a channel. Held by the pipeline, checked by the cloud. | `[release] publish_token` on the box; a secret in GitHub |
| Deploy key | An SSH key that can run one script on the box and nothing else. | GitHub environment `production`; root's `authorized_keys` |
| Environments | Where GitHub keeps the pipeline's secrets, scoped to the jobs that need them. | `release` (runtime repo), `production` (cloud repo) |

## On the desktop

The loop below runs in every install, whether or not the person has ever signed in to
anything.

1. **Boot + 15 s — the shell asks its own runtime where to poll.** `GET
   /v1/desktop/update-source` answers with a URL and, when this machine is signed in to
   Remit Cloud, the cloud session to send with it. The decision is made once, from the
   runtime's configuration and sign-in state, so the shell never has to know what kind of
   deployment it belongs to.
2. **The shell polls the manifest.** `204` means up to date, or the channel is held, or
   nothing is published. `200` carries the manifest. The manifest is never cached; the
   whole point of the poll is to see the newest one.
3. **The signature is checked before anything else happens.** The updater refuses any
   build not signed by the key compiled into the app. A compromised download host, or a
   compromised Remit Cloud, can serve a wrong file; it cannot make the app install it.
4. **The build is pre-downloaded in the background** and the card appears. Clicking is
   therefore instant rather than a multi-minute download behind a spinner. If the
   pre-download fails, the button downloads on click instead.
5. **Every 10 s while the card is showing, the shell watches for a running turn.** If any
   coworker is mid-turn the button reads *Finish the turn, then restart* and is disabled.
   It re-checks at the moment of the click too, because ten seconds is exactly long
   enough for a turn to start.
6. **Restart to update.** macOS and Linux swap the app in place and relaunch it. Windows
   hands over to the installer, which relaunches. The tray's exit path stops the old
   runtime, so no orphaned `remit-server` is left behind.
7. **Every 30 min the poll repeats** for as long as the app is open. *Later* dismisses that
   version for this run of the app; a newer version found later is offered again, and so
   is the same one after a restart.

The card is deliberately a prompt and not a silent install. Swapping the app under
someone mid-session would kill their running coworker, and quiet self-mutation sits badly
with a product whose whole posture is that nothing happens on your machine without you.
**Settings ▸ About** shows the installed version and has *Check for updates* for anyone who
does not want to wait for the next poll.

**Headless servers.** A `remit-server` running on its own — a Linux box, a terminal — has
no shell to update it. It prints its version with `remit-server -version`, and at startup
it reads the same public manifest and logs one line if a newer build is published. Its
update is a package manager's job; the log line is so an operator is told rather than left
to notice.

## Which channel answers

All three ways of running Remit see the same card. What differs is the channel the
manifest is served from, and that is decided by one thing: whether the poll carries a
Remit Cloud session.

| Running as | Poll carries | Channel served |
|---|---|---|
| Standalone, signed out | nothing | public |
| Signed in to a self-hosted broker | nothing — a broker serves no manifest, and its token is never sent anywhere else | public |
| Signed in to Remit Cloud | the cloud session | the organisation's own channel when it has one, with *Hold updates* honoured; otherwise public |

The session goes only to the origin that issued it. If an operator points
`desktop_update_url` at a mirror inside their own network, the mirror is polled anonymously
and serves the same signed files or nothing.

> **Why this matters for Cloud Enterprise.** Until this change the poll was always
> anonymous. On the hosted service an anonymous request belongs to no organisation, so the
> per-organisation channel and the console's *Hold updates* switch could never apply —
> and, as it turned out, the anonymous poll answered `500`. The test written to check the
> bearer found the 500 before it could ask its own question. Both are fixed.

An organisation's channel is served ahead of the public one for its members, which is
what makes a **canary** possible: publish to one organisation, and only its members are
offered the build. Turn on the hold and its members are told they are up to date whatever
is published. Neither touches anyone outside that organisation.

## Not yet

- **Apple notarization.** Needs an Apple Developer Program membership and a Developer ID
  Application certificate. Until then the macOS build is ad-hoc signed, which Apple
  Silicon requires to run anything at all: a downloaded installer needs System Settings ▸
  Privacy & Security ▸ *Open Anyway* once, and an update the app installs for itself runs
  without ceremony. The workflow signs and notarizes properly when the Apple secrets exist.
- **Windows code signing.** Authenticode, via Azure Trusted Signing or an EV certificate.
  Unsigned installers work but SmartScreen warns on every install.
- **A hardware-backed release key.** The protected GitHub environment is the custody model
  for now; an HSM or KMS-backed signer replaces where the signing job gets its key and
  nothing else.
- **Percentage rollouts.** The canary organisation and the hold are the brakes today.
  Staged percentages are a refinement when the fleet is large enough to need one.
- **A broker that mirrors the manifest**, for networks that cannot reach
  `api.remit-ai.app` at all. Today such a network sets `desktop_update_url` to a mirror an
  operator maintains.

## What happens if…

**…the machine is offline, or the poll fails?** Nothing. The shell tries again in thirty
minutes. No error is shown; an unreachable update host is not the person's problem.

**…the download host serves a tampered file?** The signature does not verify and the app
refuses to install it. The pipeline's own verify step would have caught the same thing
before the release was published.

**…someone gets the publish token?** They can add a release to a channel, but only one
carrying a signature from the release key; anything else is refused at publish and at
install. Rotate the token on the box and in GitHub.

**…a coworker is running when the person clicks?** The button is disabled with *Finish the
turn, then restart*, and it re-checks at the click. The turn finishes; the restart happens
when they click again.

**…the canary build is bad?** Turn on *Hold updates* for your organisation and do not
approve the global publish. Nobody outside the organisation was offered it. Publish a fixed
version under a new tag.

**…the server deploy fails halfway?** The script refuses a bad checksum before touching
anything, and rolls back to the kept binary if the new one does not become healthy. The
socket stays bound throughout, so the pause is seconds either way.

**…a machine is signed in to a self-hosted broker?** It polls the public manifest
anonymously and updates like a free install. The broker's token never leaves the broker's
origin.

**…two releases are published within the same half hour?** The manifest serves the newest
publish date. A desktop that already downloaded the first sees the second as newer at its
next check and offers that instead.

The release pipeline itself — building, signing, publishing and deploying — is documented for the people who run it, not here.
