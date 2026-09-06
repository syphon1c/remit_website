---
title: "Key custody"
description: "Whoever holds one of Remit's private signing keys can push rules, instructions or code to every machine in every customer's fleet. This page is the…"
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Whoever holds one of Remit's private signing keys can push rules, instructions or code to
every machine in every customer's fleet. This page is the decision about where they live,
per key, and how one is rotated when it does not stay there.

It is the answer to what the plan called decision 6, and it was the release blocker.

## The three keys are not the same problem

| Key | Signs | How often | Stolen, it means | Custody |
|---|---|---|---|---|
| `updates` | desktop builds | a handful of times a year | arbitrary code on every machine, immediately, with nothing in the way | **offline. No server can hold it.** |
| `policy` | policy documents (small, canonical JSON) | on demand | tighter policies only — denial of service until rotated | external signer, or encrypted at rest |
| `coworkers` | manifests and archives up to 8 MiB | whenever the gallery loads | a malicious coworker accepted by runtimes that require signatures | encrypted at rest |

Three different answers, because the risks and the mechanics differ. Pretending one answer
fits all three is how the wrong key ends up in the easiest place.

## `updates` is offline, and the code enforces it

`internal/signer` refuses this key by **name**, before any backend is chosen. There is no
configuration, path or external-signer arrangement that reaches it. A server that cannot
sign a release cannot be made to sign one, and this is the key where that matters most:
no policy, no review queue and no revocation stands between a signed build and the person
running it.

Releases arrive here already signed — `POST /v1/admin/release` takes the signature as data —
so nothing on this server ever needs the private half. Sign a build on a machine that is not
on any network, with the key on removable media or in a hardware token, and publish the
signature.

## `policy` and `coworkers`: where they may live

Three postures, weakest first. The startup log says which one this deployment has, in one
line, so nobody has to guess.

### Plaintext file — development only

The default, and it says so:

```
policy signing key loaded  custody="PLAINTEXT key file /…/policy.key (anything that can
read this file, or a backup of it, holds the key)"
```

Anything that can read the file — a backup, a snapshot, a stray copy — holds the key.

### Encrypted at rest

```bash
REMIT_CLOUD_KEY_PASSPHRASE='…' remit-cloud keys encrypt policy coworkers
```

```toml
[policy.signing_key]
passphrase_env = "REMIT_CLOUD_POLICY_PASSPHRASE"
```

Argon2id (three passes, 256 MiB) derives a key-encryption key; AES-256-GCM seals the file
with the salt as authenticated data. **A stolen disk, backup or snapshot is not a stolen
key.** It does not stop somebody already running code on the live server: the key is in
that process's memory by definition, and the log line says so.

A missing passphrase is refused rather than falling back to plaintext. A silent downgrade
would not be discovered until the key leaked.

### An external signer — the private half is elsewhere

```toml
[policy.signing_key]
command    = ["/usr/local/bin/remit-sign", "--key", "policy"]
public_key = "RWSQvktQXttUAdaN1P/fQRgDMem6jAEAv1H8f+RMqalvQh9QW5xJ0kxQ"
timeout    = "30s"
```

The content arrives on the program's **stdin**; the mode and comments as arguments; the
base64 minisign signature file on **stdout**. That is enough for a shell script in front of
a hardware module, a cloud key service, or a signing daemon on another host, and it needs no
vendor library in this binary.

Two rules the server keeps:

- **Every signature is verified against the pinned public key before it is used.** An
  external signer is somebody else's process; if it is misconfigured or compromised, the
  failure lands here and not on ten thousand machines that would refuse everything with no
  idea why.
- **A signer that fails produces an error, never an unsigned result.** A gallery that
  quietly served unsigned coworkers would be refused by every runtime requiring signatures,
  with a message about the coworker rather than about this server's key.

`coworkers` signs archives of up to eight megabytes, which is more than most remote signing
services accept in one message — encryption at rest is usually the realistic posture for
that one.

## Rotation

**A key that cannot be rotated is a key whose theft is permanent.** A runtime that trusts
exactly one key can never be moved off it: publishing a replacement would refuse every
document signed by the old one, and keeping the old one means the thief goes on signing.

So a runtime's pin is a **set**. `cloud_policy_pubkey` and `cloud_gallery_pubkey` accept
several keys, separated by commas or newlines, and a signature is admitted if any of them
verifies it.

```toml
cloud_policy_pubkey = "RWSQvktQXttUAdaN…,RWQ6/HYJsx9YvgRx…"
```

Naming more keys never admits a document that none of them signed, and nothing a server
says can add a key to the list: the pin is provisioning, never policy.

### The runbook

1. **Mint the replacement**, on the machine where that key is meant to live.
   `remit-cloud keys fingerprint` names both, for the record.
2. **Publish both public halves** in the pin, replacement second. Wait for the fleet to
   take it up — a heartbeat tells you when. Nothing signs with the new key yet, so nothing
   depends on the fleet having finished.
3. **Switch the signer** to the replacement. Documents now verify against the second
   pinned key. Anything still holding only the old pin keeps working on documents already
   admitted.
4. **Drop the old key** from the pin, and destroy the private half.

At no point is a machine stranded, and at no point is a document served that nothing can
verify. If step 1 is a response to a theft, do steps 1–3 immediately and step 4 as soon as
the fleet has caught up: from step 3 the thief's signatures buy nothing new, and from step 4
they verify nowhere.

## What is left

The dev keys in `~/.config/remit-cloud/keys` are dev keys, unencrypted, and both runtimes
compile in their public halves as defaults. Before the first paying organisation:

- Mint release keys on hardware, `updates` offline and never on a server.
- Encrypt `policy` and `coworkers` at rest, or put them behind an external signer.
- Replace the compiled-in development public keys with the real ones.
- Record both fingerprints where the people who would need them during an incident can
  reach them without this server.


## Where the updater key lives now, and how it is rotated

**Now (owner decision, 2026-09-05):** the updater's private key lives in the runtime
repository's GitHub environment `release` (and `release-global`) and nowhere else. A tag
push builds unattended; a required reviewer approves the job that uses the key. The server
never holds it — `internal/signer` refuses it by name — and the laptop that minted the
development key retires it by replacing the pubkey in `tauri.conf.json`. An HSM or KMS-backed
signer is the later step; nothing in the pipeline changes when it comes except where the
signing job gets its key.

**Rotation is a two-step**, because the app pins one pubkey: ship a release signed with the
OLD key whose `tauri.conf.json` carries the NEW pubkey; wait for the fleet to take it (the
console's Fleet page shows which build each machine runs); then sign with the new key only.
A machine that missed the bridging release will not verify anything signed after it and
reinstalls from the download page, which is the cost of a stolen key being recoverable at
all. Write the bridging release's version down here when it happens.

The production key was minted on 2026-09-05 (`tauri signer generate`, password-protected)
and the development pubkey replaced in the runtime the same day; no build signed by the
development key was ever installed outside. The private half exists only in the runtime
repository's `release` environment.
