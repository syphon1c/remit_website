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

## Making a release

The whole path starts with one command and has two places where a person acts: pushing
the tag, and running the promote workflow. (GitHub's required-reviewer rule on environments
is an Enterprise feature for private repositories, so neither step is an approval prompt;
both are things only someone with rights on the repository can do.)

```bash
git tag v0.2.2 && git push --tags
```

1. **Build — four builds, one version.** macOS arm64, macOS x86_64, Windows x86_64, Linux
   x86_64. The tag's version is written into the app's configuration and stamped into the
   runtime by the same job, so the two halves cannot disagree and nothing is bumped by
   hand. Each job builds the interface, then the runtime, then the app around it.
2. **Human step 1 is the tag itself.** The build jobs read the signing key from the
   `release` environment, and the only thing that starts them is a `v*` tag, which only
   someone with push rights can create. This is the custody model for now: the key exists
   only in that environment, and only a tag reaches it.
3. **The updater artifact is signed** with the release key and a draft GitHub Release is
   created with the installers. macOS: `RemitAI.app.tar.gz` plus a `.dmg` for first
   installs; Windows: the NSIS setup installer, which the updater uses, plus an MSI for
   hand or Intune deployment; Linux: the AppImage plus a `.deb`. The updater artifact for
   each platform has a `.sig` beside it. When the Apple secrets exist the macOS
   build is also notarized (see [Not yet](#not-yet)).
4. **Upload — files go to the download host on immutable paths.**
   `/0.2.2/darwin-aarch64/RemitAI.app.tar.gz` and so on. A path that already exists fails
   the run: a desktop may have verified and cached the first file, so a version is never
   replaced, only succeeded.
5. **Canary — the release is published to your organisation's channel.** The pipeline
   posts version, notes and each platform's URL and signature to `POST /v1/releases` with
   the publish token and `org: scapecom-org`. Remit Cloud checks that every signature is
   one the updater could read before it accepts anything. The journal records the GitHub
   run that did it.
6. **Verify.** The pipeline downloads what it just published and checks every signature
   against the public key in the app, with `minisign`. It is doing exactly what a desktop
   will do. A failure here stops the run before anyone outside the canary organisation
   could be offered the build.
7. **Human step 2 — you use the canary, then run the promote workflow.** Your own desktop
   is in the canary organisation, so the build reaches you first. However long you wait is
   the soak: an hour or a week. If the build is wrong, *Hold updates* stops it for the
   organisation and nobody else has seen it.
8. **Everyone.** `gh workflow run promote.yml -f version=0.2.2` takes the canary's
   manifest from the draft GitHub Release, verifies its assets once more, publishes it to
   the public channel and verifies the public manifest. From here every desktop is offered
   it at its next poll, within thirty minutes or at its next launch.

Everything the workflow does is also a script a person can run:
`scripts/release/pipeline.sh` has the four verbs `collect`, `upload`, `publish` and
`verify`. If GitHub is down on the day, the same release can be made from a laptop with
the same credentials.

## Deploying the server

Remit Cloud has its own workflow, in its own repository, and it is deliberately simpler
than the desktop's because there is one server and it is ours.

1. **A `v*` tag on the cloud repository** runs lint and tests, then builds the Linux binary
   and its checksum.
2. **The job reads the deploy key from the `production` environment.** The tag, or a
   manual run from the Actions tab, is the human step; nothing else starts it.
3. **The binary and checksum are sent over SSH as one tarball on standard input**, to a key
   whose only permitted command is the deploy script. No shell, no file copy, no port
   forwarding: the `authorized_keys` line names the script and forbids everything else.
   The server's host key is pinned in the workflow, so a deploy cannot be redirected to
   whoever answers the address.
4. **On the box, the script verifies the checksum, keeps the running binary as
   `remit-cloud.prev`, stops the service, installs, starts, and waits for health.** The
   socket unit stays up throughout, so port 443 remains bound and connections arriving
   during the swap wait a second instead of being refused.
5. **If the service is not healthy within twenty seconds the script puts the previous
   binary back** and fails the run with the last twenty log lines.
6. **The workflow checks from outside:** health, and that discovery reports the version it
   just deployed.

The script is the same steps as the runbook's manual procedure, on purpose. What CI does
and what a person does at three in the morning are one procedure.

## The three credentials

Three separate secrets, each able to do one thing. Losing one does not give up the others.

| Credential | Can | Cannot | Lives |
|---|---|---|---|
| Release key | make a build that every desktop will install | publish it (that needs the token), or reach the server | the `release` environments; an HSM is the later step |
| Publish token | add a release, or a canary, to a channel | sign anything — a release it adds must already carry a valid signature or the app refuses it; read or change anything else on the cloud | on the box and in GitHub |
| Deploy key | run the deploy script on the box | open a shell, copy files, forward ports; a bad checksum is refused before anything is touched | the `production` environment |

And one rule rather than a credential: the desktop sends its cloud session only to the
origin that issued it. A mirror, a broker or anyone else gets an anonymous poll.

The property that holds it together is that **Remit Cloud informs and the desktop
verifies**. The cloud can say a new version exists; it cannot make a desktop install
something the release key did not sign. That is the same shape as policy, where the cloud
can only ever tighten what a runtime permits, and it is why a compromised server is a
nuisance rather than a takeover.

## Day to day

The step-by-step commands, with what to expect at each, are in
release-runbook.md. The short forms:

**Ship a release.** Tag this repository, use the canary on your own machine, then
`gh workflow run promote.yml -f version=<the version>`.

**See what is live.** `https://api.remit-ai.app/download` is the page people install from:
the newest public release per platform with checksums, rendered from the release store so
it changes the moment a promote lands. `curl -i https://api.remit-ai.app/desktop/latest.json`
shows the public channel (`204` when there is nothing). The console's **Fleet** page shows which
build each machine is running. **Coworker Gallery ▸ Updates** shows the organisation's hold
and its latest version.

**Stop an organisation from taking updates.** Console ▸ Coworker Gallery ▸ *Hold updates*.
Its members are told they are up to date until the hold is released. Nothing else changes
for them.

**Pull back a bad release.** There is no unpublish; the manifest always serves the newest
publish date. Hold the affected organisation first if the release is still a canary. To
roll everyone back, publish the previous good version again with a later publish date —
the pipeline's `publish` verb, or `remit-cloud release add` on the box — and desktops are
offered it at their next poll. Desktops that already took the bad build see the older
version as an update and can move to it.

**Check a channel by hand.** `remit-cloud release verify --url
https://api.remit-ai.app/desktop/latest.json --pubkey <the app's pubkey>` downloads every
asset and checks every signature, naming the one that fails.

**Publish without GitHub.** Sign the artifact with `npx tauri signer sign`, upload it, then
`remit-cloud release add` on the box or the pipeline script's `publish` verb from a laptop
with the token.

**Deploy the server.** `gh workflow run deploy.yml -R syphon1c/remitai-enterprise`, or a
`v*` tag on the cloud repository; in use for `api.remit-ai.app` since 5 September 2026. By
hand: `make dist`, then either the documented copy-and-install steps, or
`ssh -i deploy-key -p 65221 root@<ip> < upload.tgz`, which runs the same script the
workflow does.

## One-time setup

Everything below is an owner action; none of it is code. Once done, a tag runs the whole
path.

| # | What | Where the value goes |
|---|---|---|
| 1 | Mint the production release key and compile its public half into the app, retiring the development key. **Done 5 September 2026.** | `TAURI_SIGNING_PRIVATE_KEY` and `…_PASSWORD` in the `release` environment; no laptop holds the private half |
| 2 | Create the R2 bucket `remit-downloads`, attach `downloads.remit-ai.app` as its public custom domain, mint a token scoped to object writes on that bucket. **Done 5 September 2026.** | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` in `release`; variables `R2_BUCKET`, `DOWNLOADS_BASE_URL` |
| 3 | Generate the publish token and set it on the box as `REMIT_CLOUD_RELEASE_PUBLISH_TOKEN`; the publish route answers 401 instead of 404 once it is there. **Done 5 September 2026.** | the same value as `RELEASE_PUBLISH_TOKEN` in the `release` environment; variables `CLOUD_URL`, `CANARY_ORG` (set) |
| 4 | Create the `release` environment in this repository and put the secrets above in it. **Done 5 September 2026.** | GitHub ▸ Settings ▸ Environments |
| 5 | Mint the deploy key (`ssh-keygen -t ed25519 -f deploy-key -C ci-deploy -N ""`), install `deploy/remit-cloud-deploy.sh` on the box as `/usr/local/bin/remit-cloud-deploy`, add the one restricted line to root's `authorized_keys`, pin the host key with `ssh-keyscan -p 65221`. **Done for api.remit-ai.app on 5 September 2026.** | `DEPLOY_SSH_KEY` in the cloud repository's `production` environment; variables `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_HOST_KEY`, `CLOUD_URL` |
| 6 | Tag, watch the canary land on your own machine, then run the promote workflow for that version. **Done 5 September 2026:** 0.2.2 was the first release through the pipeline, 0.2.3 the same day with the macOS bundle sealed; both on the canary channel, and the owner's Mac took 0.2.3 through the updater: offered, verified, installed in place, relaunched. Promoted to everyone the same day: the public channel serves 0.2.3, verified from the box. | |

**Rotating the release key later.** The app pins one public key, so rotation is a two-step:
ship a release signed with the old key whose configuration carries the new public key,
wait for the fleet to take it (the Fleet page shows who has), then sign with the new key
only. A machine that missed the bridging release reinstalls from the download page.
Written up in the cloud repository's `docs/key-custody.md`.

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
