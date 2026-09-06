---
title: "Deploying Remit Cloud"
description: "The shape this is written for: a Linode instance, TLS terminated at Cloudflare, Postgres alongside. Most of it applies to any origin behind any CDN."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

The shape this is written for: a Linode instance, TLS terminated at Cloudflare, Postgres
alongside. Most of it applies to any origin behind any CDN.

**This page is the reasoning. `../deploy/README.md` is the runbook** —
the commands in order, with a systemd unit, a production config and scripts for the
Cloudflare ranges and the backups. Read this one first: it says what each control is for and
what happens without it, which is what makes the runbook safe to follow rather than
transcribe.

## The five things that matter

1. **The origin must not be reachable except through Cloudflare.** Everything else here
   assumes that, and none of it survives without it.
2. **Tell the server which proxies to believe**, or every request is rate-limited against
   Cloudflare's address instead of the caller's.
3. **Terminate TLS at the origin as well**, and require Cloudflare's client certificate.
   Either way, tell the server its public origin is `https://`.
4. **The database connection must be encrypted**, and a backup is only a backup once you
   have restored one and run `remit-cloud verify` against it.
5. **The signing keys** are `docs/key-custody.md`, and none of this changes that.

And one that is not a control but is the shape everything else assumes: **the origin
listens on 443, and binds nothing** — see below.

## 1. Lock the origin to Cloudflare

Two layers, because either alone fails open.

**The firewall.** Linode Cloud Firewall, inbound: allow 443 only from Cloudflare's
published ranges, allow SSH from wherever you administer it, drop the rest.
Cloudflare publishes the list at `https://www.cloudflare.com/ips/` and it changes, so
refresh it on a schedule rather than pasting it once.

**Authenticated Origin Pulls.** Cloudflare presents a client certificate to your origin, and
the origin refuses connections without it. That closes the window where a new Cloudflare
range has not reached your firewall yet, and it stops anyone else's Cloudflare account being
pointed at your address.

Without both, somebody who finds the instance's address connects around Cloudflare entirely
— past the rate limits, past the bot rules, and with forwarded headers of their own
choosing.

## The privileged port, and why the service still holds no capability

The origin listens on **443**. Not a high port — a high port only works while something in
front of it is configured to reach that port, which makes the origin's correctness depend
on the CDN's configuration rather than on its own. Anything that talks to it directly — a
health checker, a customer running DNS-only for an afternoon, an operator with `curl` —
finds nothing at the address it was given.

Binding 443 normally means `CAP_NET_BIND_SERVICE`, and that is a real cost: a process
granted it holds it for its whole life, so a compromise inherits the ability to bind *any*
privileged port. That is the step where a taken web server becomes the machine's DNS
server or its SMTP server.

So neither. `remit-cloud.socket` binds 443 as PID 1, before the service process exists, and
passes the descriptor; `remit-cloud.service` accepts on it with `CapabilityBoundingSet=`
and `AmbientCapabilities=` both empty. The server cannot bind 443. It cannot rebind it. It
cannot bind anything else below 1024, and there is no capability sitting there for a
compromise to pick up.

Two consequences worth knowing:

- The socket unit names **both** address families — `0.0.0.0:443` and `[::]:443`. A bare
  `ListenStream=443` follows the kernel's `bindv6only`, and on Ubuntu 26.04 that produced
  an IPv6-only socket: `ss` showed `[::]:443`, it looked right, and every IPv4 connection
  was refused.
- `listen` in the config is **not used** when the service is socket-activated, and the
  startup log says so by name. The service `Requires=` the socket rather than falling back
  to binding `listen` itself, because a fallback means a unit reporting "active" while the
  port the world connects to answers nothing.

The socket stays bound while the service restarts, so connections during a deploy wait in
the kernel's queue instead of being refused. Restart the service; leave the socket alone.

## 2. Trusted proxies

```toml
[server]
public_url      = "https://cloud.example.com"
trusted_proxies = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
  # …the rest of https://www.cloudflare.com/ips/, and your own private ranges if any
]
```

**Empty means none**, and every request is counted against the socket it arrived on. Behind
Cloudflare that puts the whole world in one bucket: one caller exhausts the sign-in and
webhook budgets for everybody.

The opposite mistake is worse and used to be the default. Believing `X-Forwarded-For` from
anybody lets a stranger name a victim and fill *that victim's* bucket — flood control turned
into a targeted denial of service — while the attacker rotates the header and meets no limit
at all. So the header is believed only from a connection that came from a listed proxy.

With proxies configured, the server prefers `CF-Connecting-IP` (one value, set by the edge)
and otherwise walks `X-Forwarded-For` from the right, skipping trusted hops. It never takes
the leftmost entry, which is whatever the client wrote.

The server warns at startup when `public_url` is `https://` and no TLS is configured here
and no proxies are trusted — the exact combination that means headers are arriving and being
ignored.

## 3. TLS at the origin, and the certificate that locks it

Terminate TLS at the origin too, and require Cloudflare to prove itself:

```toml
[tls]
cert_file      = "/etc/remit-cloud/tls/origin.pem"   # a Cloudflare Origin Certificate
key_file       = "/etc/remit-cloud/tls/origin.key"
client_ca_file = "/etc/remit-cloud/tls/origin-pull-ca.pem"
min_version    = "1.2"
```

`client_ca_file` is **Authenticated Origin Pulls**, and it is the strongest single control
in this deployment. Cloudflare presents a client certificate; the origin requires and
verifies it. Somebody who finds the instance's address and connects directly is refused
during the handshake, before a request is parsed — so the rate limits, the forwarded-header
rules and every path behind them are never reached at all.

It is required and verified, never "if given": optional at the caller's choosing is no
control. Cloudflare publishes the authority to pin, and the server logs a warning at
startup when TLS is on without one.

Set Cloudflare's SSL mode to **Full (strict)** to match. Leaving `[tls]` empty also works —
the server speaks plain HTTP behind the edge — but then only the firewall stands between
the origin and the internet.

`public_url` must be the `https://` address people actually use. Two things depend on it:

- The console's cookies are marked `Secure` when it starts with `https://`. Get it wrong and
  either the cookies never arrive (marked Secure over plain HTTP) or they travel in the
  clear.
- Every redirect the sign-in builds. A mismatch here sends people to an address the identity
  provider will not accept.

## 4. More than one hostname

An `api.` for the coworkers and a `console.` for the browser is the usual shape, and it
needs one line — a CNAME alone produces a sign-in loop:

```toml
public_url = "https://api.example.com"

[console]
origins = ["https://console.example.com"]
```

`public_url` anchors every sign-in redirect. Without `console.origins`, a browser arriving
at `console.example.com` is sent to `api.example.com` to sign in, the session cookie is set
on `api.example.com` — cookies are host-scoped, and these carry no `Domain` — and the
browser returns to a console that cannot see it. It loops, and no log says why.

`console.origins` is an **allowlist and has to be one**. The value becomes the sign-in's
`redirect_uri`, so deriving it from the `Host` header instead would let anyone who can
reach the origin choose where the authorization code is delivered. A host that is not
listed falls back to `public_url`, which fails visibly rather than quietly.

A hostname listed there also serves the console at its root, so `console.example.com` lands
on the console rather than the API's 404. Only there: the API root stays a 404, because a
redirect on every hostname advertises an administration surface to every scanner that
touches the origin.

## 5. Identity provider callbacks

Every hostname the console is reachable on needs its own entry in the provider's
allowed-callback list — not just `public_url`:

```
https://api.example.com/v1/auth/callback         the coworker
https://api.example.com/console/callback         the browser console
https://console.example.com/console/callback     …and on every console origin
```

The startup log names the console origins for this reason: a missing callback here is the
other way to produce a sign-in that never completes.

## Cloudflare settings worth checking

| Setting | Why |
|---|---|
| WebSockets: **on** | the relay is a WebSocket; without it, connectors never deliver |
| Caching on `/v1/*` and `/console/*`: **off** | these are per-identity; a cached answer is somebody else's |
| `/desktop/latest.json`: cacheable, but briefly | a long cache outlives a release hold, and the hold is how an organisation stops a rollout |
| Bot Fight Mode | fine for the browser console; exclude `/v1/relay/*` and the webhook paths, which are machines |
| Upload size | bundles are capped at 8 MiB here, well under any plan's limit |

The relay pings every thirty seconds, inside Cloudflare's idle timeout, so long-lived
sockets survive without tuning.

## Postgres

Managed Postgres is the shorter path: backups, point-in-time recovery and patching stop
being yours. Whichever you choose:

- The database holds policy documents, evidence, membership and the gallery queue. It holds
  **no work content and no connector tokens** — see `docs/evidence.md` — so a stolen dump is
  serious but is not somebody's conversations.
- Restrict it to the instance's private address; never the public one.
- Migrations run at startup under an advisory lock, so two instances starting together is
  safe.

**The connection must be encrypted, and the server refuses it otherwise.** Everything
durable crosses that link, and `sslmode=disable` is one word carried over from a development
URL and never noticed again. A connection to anything but loopback needs `sslmode=require`
at least:

```
postgres://user:pass@db.example.com:5432/remit?sslmode=verify-full&sslrootcert=/etc/remit-cloud/db-ca.pem
```

`verify-full` with the provider's CA is the one to use where you have the certificate:
`require` encrypts but authenticates nothing, so it stops a passive listener and not an
active one. Loopback is exempt, because a development database on this machine crosses
nothing.

## Backups, and knowing they work

A backup is tested by **restoring it**, not by observing that the job ran. The reason
nobody does is that a restore ends with a database and no way to say whether it is right.

```bash
remit-cloud verify -config /etc/remit-cloud/remit-cloud.toml
```

Read-only. It checks the schema is the version this binary expects, that every
organisation's policy chain still follows itself, and prints what each organisation holds —
members, documents, events, anchors, machines, connections — so you can compare the numbers
with what you meant to restore. Exit status is 0 when everything verifies and 1 when
anything does not, so a restore script can act on it without parsing anything.

The chain is what makes this more than a connection test. Every governed act is linked to
the one before it, so a partial restore, a table recovered from a different point in time,
or a dump taken without a consistent snapshot all show up as a chain that does not verify.

**Run it against production on a schedule too.** A chain that stops verifying there is not a
restore problem: it is somebody rewriting history, and that deserves an alarm either way.

Whatever takes the backups:

- Managed Postgres with point-in-time recovery is the shorter path; the provider's snapshots
  are consistent, which a naive `pg_dump` from a busy database may not be.
- Encrypt them at rest and keep them somewhere the origin cannot reach, so that whoever
  takes the instance does not also take its history.
- Restore into a scratch database and run `verify` against it. Monthly, and after any change
  to how backups are taken.

## Before the first paying organisation

- Key custody per `docs/key-custody.md`: the updater key offline, the other two encrypted at
  rest or behind an external signer, and the compiled-in development public halves replaced.
- Backups tested by restoring one and running `remit-cloud verify` against the restore.
- The firewall and Authenticated Origin Pulls both on, and a check that the origin address
  answers nothing when approached directly.
- `trusted_proxies` set, and the startup log free of its warning.
