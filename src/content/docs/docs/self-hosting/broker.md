---
title: "The broker"
description: "A self-hosted, on-premises stand-in for Remit Cloud, scoped to one job: sharing persona definitions across a company network."
---

<p class="rm-synced">Part of the remit-broker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

A self-hosted, on-premises stand-in for Remit Cloud, scoped to **one job**:
sharing persona definitions across a company network.

It speaks the wire protocol remit-ai
already expects, so an **unmodified** `remit-server` signs in against it and
installs personas from it. No client patch, no fork, no forked build.

Curating the gallery rather than deploying the broker?
[**USER_GUIDE.md**](/docs/self-hosting/broker-curating/) covers adding and sharing coworkers.

## Documentation

| | |
|---|---|
| **[Your first real deployment](#your-first-real-deployment)** | the ordered walkthrough, below |
| [docs/auth.md](/docs/self-hosting/broker-auth/) | auth modes, TLS, sign-in codes, operators |
| [docs/sharing.md](/docs/self-hosting/broker-sharing/) | what travels, uploads, review, the journal |
| [docs/api.md](/docs/developers/broker-api/) | every endpoint and its shape |
| [USER_GUIDE.md](/docs/self-hosting/broker-curating/) | for whoever curates the gallery |

## Quick start

```sh
make build
./bin/remit-broker            # :8443, ./personas, auth mode `none`, no TLS
curl -s localhost:8443/healthz
```

That serves the three example personas in `personas/`. It is a trial, not a
deployment: TLS is not optional for sign-in, the default auth mode asserts no
identity, and those three examples are samples rather than content. **Your first
real deployment** below is the ordered walkthrough.

## Your first real deployment

The defaults are built for a five-minute trial on a laptop. Every one of them is
the wrong choice for a gallery a company actually uses, and each is wrong in a
way that is quiet rather than loud — nothing fails, you just end up serving
something you did not mean to.

| Default | What it costs in a real deployment |
|---|---|
| `dir = "./personas"` | Publishes the three **sample** coworkers to everyone, under publishers nobody at your company chose |
| `pending_dir` unset | Uploads are refused; the app offers no Publish button |
| `publisher` unset | Uploaded coworkers are labelled `Internal` |
| no `[tls]` | **Sign-in cannot work.** The client hardcodes `https://` |
| `public_url` unset | Redirect validation falls back to the request's own host |
| `auth.mode = "none"` | Anyone who can reach the port reads the whole gallery |

### 1. Give it a directory of its own

```sh
sudo mkdir -p /srv/remit/{personas,queue}
sudo chown "$BROKER_USER" /srv/remit/queue  # whoever the broker runs as writes here
```

`queue` must sit **outside** `personas`. The gallery scans `personas`, so a
queue inside it would serve every upload the moment it arrived — the broker
refuses to start in that configuration rather than let it happen quietly.

Copy in the samples you want, or none. `personas/` in this repo is a format
reference, not a starter set.

### 2. Write the configuration

```toml
listen     = "127.0.0.1:8443"                  # behind a proxy; ":8443" to face the network
public_url = "https://gallery.corp.example"    # what clients reach you at

[gallery]
dir         = "/srv/remit/personas"
pending_dir = "/srv/remit/queue"               # omit to refuse uploads entirely
publisher   = "Acme"                           # label on cards whose manifest declares none

[auth]
mode = "none"                                  # docs/auth.md — `oidc` if you have an IdP
# require_verification = true                  # step 5
```

`public_url` is not cosmetic: it anchors `redirect_uri` validation. Set it to
the origin clients actually use, scheme included.

### 3. Terminate TLS

Not optional, and not a hardening step you can defer — the client builds its
sign-in URLs with a hardcoded `https://`, so plain HTTP does not fail at the
edges, it fails entirely. Either give the broker a certificate (`[tls]`) or put
it behind a proxy that has one. See [TLS is required in practice](/docs/self-hosting/broker-auth/#tls-is-required-in-practice)
for why the scheme is not negotiable.

### 4. Decide what `none` mode means for you

Mode `none` mints tokens without asking who anybody is. Every signed-in person
gets in, and the network is the whole perimeter. That is a reasonable choice on
an internal network, and a poor one for anything reachable more widely — the
gallery is readable by whoever can open the port. If you have an IdP, use
`oidc`; it costs one config block and makes identities verified rather than
claimed.

### 5. Decide whether to require a sign-in code

Off by default. On, a one-time code becomes part of signing in and the gallery
stays closed until it is entered — see
[requiring a sign-in code](/docs/self-hosting/broker-auth/#requiring-a-sign-in-code) for what it
does and does not prove.

Worth turning on before people publish coworkers to each other, because
ownership of a published coworker rests on the address that published it. Left
off, that address is asserted rather than checked.

```toml
[auth]
require_verification = true
```

Without `[smtp]`, codes arrive in this broker's log for you to relay. That works,
and it is honest about being weaker — but it means being on hand for every
sign-in, which is fine for a pilot and not for a department.

### 6. Point the workers at it

Send people the invite link the broker prints at every start:

```
remit://join?gallery=https%3A%2F%2Fgallery.corp.example
```

Clicking it opens Remit on "join a gallery" with this address filled in — and
nothing else: the app asks the broker what it is, shows what it found, and the
person presses Sign in. The link signs nobody in and carries no token, so it is
safe to put in a wiki. Without Remit installed it does nothing; the address
alone, typed into first-run setup or **Settings ▸ Cloud**, does the same.

For a fleet rollout, provision each worker's `config.toml`
(`~/.config/coworker/config.toml`) instead:

```toml
cloud_base_url    = "https://gallery.corp.example"
cloud_auth_domain = "gallery.corp.example"      # bare host: the client adds https://
cloud_client_id   = "remit-desktop"
cloud_audience    = "https://gallery.corp.example"
```

Then sign in from the app. People should set their name and email first
(Settings ▸ General) — publishing needs an identity, and coworkers are
attributed to it.

### 7. Know how it behaves once it is running

- **Approving needs a reload.** `gallery approve` moves the bundle; the running
  broker keeps its old scan until `kill -HUP`. Same as adding a manifest by hand.
- **An unknown setting stops the broker**, naming it. TOML has no way to close a
  table, so a key written below `[smtp]` becomes an *smtp* setting however
  obviously it belongs elsewhere — `operators` placed at the end of a file is the
  classic. Silently ignoring it would leave you believing a control is on when it
  is off, so it refuses instead.
- **Configuration is read at startup.** `SIGHUP` reloads the GALLERY, not the
  config — so a new `operators` list, a changed `[smtp]`, or a flipped
  `require_verification` needs a restart. Editing the file and sending `HUP` is
  the commonest way to be sure a setting is on while the broker is still running
  without it. `GET /v1/admin/whoami` says which of these is the problem.
- **A code is issued every sign-in**, when required — including after a restart,
  which signs everyone out. With no `[smtp]`, that is a log line to relay per
  person per sign-in.
- **Restarting signs everyone out.** In mode `none` the token-signing secret is
  32 random bytes generated per process, so a restart invalidates every session
  and everyone signs in again. Harmless, surprising if you do not expect it, and
  a reason to reload rather than restart when you only changed the gallery.
- **Back up the journal.** `queue/journal.jsonl` is the provenance record AND
  where ownership comes from. Lose it and nobody owns anything they published;
  people can re-upload, but nobody can replace or remove what is already there.
  It is append-only and small — an ordinary file backup is enough.
- **Who has signed in is not persisted.** That directory is in memory and a
  restart forgets it. Ownership does not depend on it; it comes from the journal.
- **Uploads are bounded** at 8 MiB per archive, 200 files, and 20 coworkers per
  uploader. A refused upload is journalled with its reason, so `gallery journal`
  answers "did somebody try" as well as "what got published".

## Pointing remit-ai at it

One address. In the app's first-run setup pick **My team's gallery** and type
this broker's `public_url` — or click the invite link the broker logs at start,
`remit://join?gallery=<public_url>`, which fills it in. The app asks
`GET /v1/discovery` what it is, tells the person whose gallery it found and how
signing in will go, and derives the endpoint block below itself. **Settings ▸
Cloud** does the same later.

By hand, in the client's `config.toml` (`<state-dir>/config.toml`) — for a
fleet rollout, where the file is provisioned before anyone signs in. These keys
are file-only: the client reads no environment override for them.

```toml
cloud_base_url    = "https://broker.corp.example"
cloud_auth_domain = "broker.corp.example"   # bare host: the client adds https://
cloud_client_id   = "remit-desktop"         # any value, unless you pin one
cloud_audience    = "https://broker.corp.example"
```

Then sign in from the app as usual (account menu ▸ Coworker Gallery ▸ Sign in).
In `none` mode the browser round-trip completes without a prompt, and the gallery
populates.

`cloud_base_url` must equal the broker's `public_url`: the client derives its
`redirect_uri` from it, and the broker validates that the redirect belongs to
itself.

## Configuration

TOML file plus environment overrides; environment wins. See
`broker.example.toml` for every knob with commentary.
Each scalar has a `REMIT_BROKER_<PATH>` twin:

> **Breaking, at the Remit rename:** this prefix was `OPENWORKER_BROKER_*` and
> there is no fallback — the old names are read by nothing. A deployment still
> setting them loses those overrides silently, `AUTH_MODE` included, so check
> your unit files and container env before upgrading.

```sh
REMIT_BROKER_LISTEN=:9443 \
REMIT_BROKER_AUTH_MODE=oidc \
REMIT_BROKER_AUTH_OIDC_ISSUER=https://corp.okta.com/oauth2/default \
REMIT_BROKER_GALLERY_DIR=/srv/personas \
  ./bin/remit-broker
```

```
remit-broker --config broker.toml [--log-level info] [--version]
```

## Development

```
make build    # -> bin/remit-broker
make test     # go test ./...
make race     # with the race detector
make lint     # gofmt gate + go vet + golangci-lint if installed
make check    # lint + test (CI entry)
make run      # local trial on the built-in defaults
```

### Layout

```
cmd/remit-broker/   the binary: config, signals, graceful shutdown
internal/config/         TOML + env, defaults, validation
internal/auth/           Authenticator interface, `none` and `oidc` modes, JWKS
internal/directory/      who has signed in: one record per email, in memory
internal/journal/        append-only hash-chained record of gallery changes
internal/uploads/        the review queue: validation, write safety, ownership
internal/verify/         one-time sign-in codes: minting, attempts, delivery
internal/gallery/        manifest scan → cards, markdown, hashes
internal/server/         routes, middleware, the loopback bounce
personas/                three example manifests
```

### Dependencies

Two, both load-bearing:

- **`github.com/BurntSushi/toml`** — the config format the requirements call for.
- **`gopkg.in/yaml.v3`** — persona frontmatter is YAML, and this is the exact
  parser remit-ai uses on the same files. Hand-rolling a YAML subset here
  would let the broker's card metadata quietly disagree with what the client's
  parser sees in the same document.

Everything else is standard library, including the JWT and JWKS handling
(`crypto/rsa`, `crypto/sha256`, `math/big`) — a JWT verifier is small, and
writing it beats auditing a dependency for the three algorithms this needs.

