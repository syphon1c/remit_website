---
title: "Broker authentication"
description: "How this broker decides who is calling, and what that is worth."
---

<p class="rm-synced">Part of the remit-broker documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

How this broker decides who is calling, and what that is worth.

- [TLS is required in practice](#tls-is-required-in-practice) — not optional
- [Auth modes](#auth-modes) — `none` and `oidc`
- [Who is calling](#who-is-calling) — self-asserted identity
- [Requiring a sign-in code](#requiring-a-sign-in-code)
- [The loopback bounce](#the-loopback-bounce)
- [Operators](/docs/self-hosting/broker-sharing/#reviewing-without-a-shell) — who may administer the
  gallery. An operator is an established identity on an allowlist, so it depends
  on everything above; the surface itself is documented with review.

## TLS is required in practice

remit-ai builds its authorize and token URLs by putting a literal `https://`
in front of `cloud_auth_domain`:

```go
authorizeURL := "https://" + cfg.CloudAuthDomain + "/authorize?" + query
...postForm(ctx, "https://"+cfg.CloudAuthDomain+"/oauth/token", form, ...)
```

The scheme is hardcoded. Sign-in therefore **cannot** work over plain HTTP.
Either terminate TLS at the broker:

```toml
[tls]
cert_file = "/etc/remit-broker/tls/fullchain.pem"
key_file  = "/etc/remit-broker/tls/privkey.pem"
```

…or put it behind a reverse proxy that does, and leave `[tls]` empty. The broker
logs a warning at startup when it is listening without TLS, because the failure
it causes otherwise looks like a broken IdP rather than a missing certificate.

`cloud_base_url` (the API leg) has no hardcoded scheme, so it can be `http://`
behind a terminator. Keeping both on the same HTTPS origin is simpler.

## Auth modes

The auth layer is an interface (`internal/auth.Authenticator`: `Mode`,
`Authenticate`, `Routes`). Two implementations ship; a third — mTLS, a static
shared token, an internal SSO shim — is a new file, not a refactor.

### `none` (default) — the broker is its own issuer

"No authentication" cannot mean "no tokens": the client refuses to call the
gallery without one, so a broker that issues nothing serves nothing. This mode
keeps the client's shipped sign-in flow byte-for-byte intact while asserting
nothing about who the user is.

- `GET /authorize` issues a code immediately — no login page, because there is no
  identity to establish.
- `POST /oauth/token` exchanges it, verifying **PKCE S256 properly**: a code
  without its verifier is worthless, the code is single-use, and a failed
  exchange still burns it. `redirect_uri` must byte-match the authorize leg's
  (RFC 6749 §4.1.3).
- Access tokens are opaque — 32 random bytes plus an HMAC tag under a
  per-process secret, so a forged string is rejected in constant time before any
  map lookup. Sessions live in memory with an expiry; a restart signs everyone
  out, which is the honest behaviour for an in-memory issuer.
- Refresh tokens rotate: a stolen one races the legitimate client and loses.

Everyone who can reach the broker gets the same configured identity
(`auth.none.subject` / `email` / `name`). **The network is the perimeter.** Do
not expose this mode to the internet.

### `oidc` — a real IdP authenticates

```toml
[auth]
mode = "oidc"

[auth.oidc]
issuer   = "https://corp.okta.com/oauth2/default"
audience = "api://remit"
jwks_url = "https://corp.okta.com/oauth2/default/v1/keys"
authorize_url = "https://corp.okta.com/oauth2/default/v1/authorize"
token_url     = "https://corp.okta.com/oauth2/default/v1/token"
audience_param = "-"        # Okta rejects Auth0's `audience` param
```

Bearer validation: RS256 only (`alg: none` and HMAC algorithms are rejected
before any key lookup), issuer must match exactly, audience must contain the
configured value (string or array form), `exp` is required, `nbf` honoured, both
with a configurable skew. JWKS is fetched and cached; an unknown `kid` triggers
one refetch — throttled by `jwks_min_refresh`, so a stream of bogus kids cannot
become a flood aimed at your IdP. Keys under 2048 bits are refused.

#### Okta, Auth0 and Entra disagree about paths

remit-ai hardcodes **Auth0's** paths. The others do not use them:

| IdP    | authorize                          | token                          |
| ------ | ---------------------------------- | ------------------------------ |
| Auth0  | `/authorize`                       | `/oauth/token`                 |
| Okta   | `/oauth2/v1/authorize`             | `/oauth2/v1/token`             |
| Okta†  | `/oauth2/<serverId>/v1/authorize`  | `/oauth2/<serverId>/v1/token`  |
| Entra  | `/<tenant>/oauth2/v2.0/authorize`  | `/<tenant>/oauth2/v2.0/token`  |

† custom authorization server.

So by default (`proxy_endpoints = true`) the broker keeps serving the two paths
the client expects and forwards them to the configured URLs — a 302 for
`/authorize` (PKCE and `state` untouched), a server-side POST for
`/oauth/token`. That is what lets an unmodified client sign in against a non-Auth0
IdP, and it keeps a confidential client's secret off the desktop.

With **Auth0**, whose paths already match, you can instead set
`proxy_endpoints = false` and point `cloud_auth_domain` straight at the IdP —
the broker then only serves `/v1/auth/callback` and validates bearers. Both
shapes are supported; the proxy is the default because it is the one that works
everywhere.

## Who is calling

The worker collects a name and email locally at setup — **self-asserted, never
verified** — and posts them here after signing in. The broker keeps one record
per email address: who they said they are, when they were first and last seen,
and that none of it is verified. `/v1/me` then answers with that person instead
of the deployment-wide label from `[auth.none]`, so an operator reading logs and
a gallery crediting a shared coworker both see somebody rather than
`everyone@localhost`.

Two rules this obeys, both worth stating plainly:

- **A self-asserted claim never overrides a verified one.** In `none` mode there
  is nothing to override, so the claim is taken. In `oidc` mode the identity
  came from a signature, and the claim is reported back as `applied: false`
  rather than applied — otherwise a valid token for one person would be a claim
  to be anyone. The broker decides this by asking whether the auth mode
  implements `auth.IdentityBinder`; `oidc` deliberately does not, so a future
  verifying mode is impersonation-resistant by saying nothing.
- **Nothing a caller sends can set `verified`.** There is no parameter for it.
  Verification is something the broker would establish, never something the
  party being verified declares.

The identity travels in a POST body, never on the authorize URL — that URL goes
through the system browser, into history, and the client logs it.

The record is **in memory, per process**, like the self-issued session store
beside it. A restart forgets it. Persistence arrives with the upload queue,
which needs atomic writes, containment checks and a journal — work that should
land once, with uploads, rather than half-built here.

### Requiring a sign-in code

Off by default. Turn it on and a one-time code becomes a **required step** of
signing in: the session authenticates, but cannot reach the gallery until the
code is entered, and a new code is issued every sign-in.

```toml
[auth]
mode                 = "none"
require_verification = true

[smtp]
host = "smtp.corp.example"
port = 587
from = "remit@corp.example"
username = "remit"
password = "…"
# starttls = true            # default; sending a code in the clear is not a default
```

**With `[smtp]` configured** the code is emailed, and verifying proves the
person holds the address. **Without it** the code is written to the broker log
for an operator to relay, and the record says `operator` rather than `email` —
still a check, but it proves they can reach you, not that they own the mailbox.
The distinction is kept because ownership of published coworkers rests on it.

A failed send does **not** fall back to the log. One misconfigured mail server
would otherwise downgrade everybody from verified-by-email to
verified-by-operator with nothing saying so.

Codes are six digits, expire in ten minutes, allow five attempts, and belong to
one session — a code minted for one sign-in cannot admit another. Minting a new
one kills its predecessor, which is what "a new code every sign-in" has to mean.

**Minting is rate limited**, because minting is what makes this broker send mail.
Without a bound, anyone who can reach it can sign in — free, in mode `none` —
bind an identity as *any* address, and have a code mailed there as fast as they
like, from your mail server to somebody else's inbox. Five per address and sixty
in total per fifteen minutes by default:

```toml
[auth]
code_rate_per_address = 5     # protects a person's mailbox
code_rate_global      = 60    # protects your mail server and its reputation
code_rate_window      = "15m"
```

Two dimensions because they defend different things: per-address alone does
nothing against a spread across a thousand addresses, and a global limit alone
lets one mailbox absorb the whole budget. `0` disables a dimension, which is a
decision rather than a default. A refused mint answers **429** with a wait the
client can act on, and never charges a person's allowance for a refusal the
broker's own capacity caused.

Off (the default), identities remain **self-asserted**: a label, not a
credential, granting nothing on its own. `POST /v1/identity/verify` answers 501
in that configuration, because there is nothing to check.

Not available in `oidc` mode, and refused in configuration: the identity
provider already established who the user is, and a second code from this broker
would be theatre.

## The loopback bounce

`GET /v1/auth/callback` exists because the packaged desktop app binds its sidecar
to a **random free port** that no IdP redirect allow-list could enumerate.
remit-ai registers one stable redirect URI — this one — and smuggles the
port as the suffix of `state` after the last `.`, since every OAuth server echoes
`state` back untouched. The broker bounces the browser onward:

```
GET /v1/auth/callback?code=…&state=<random>.51234
  → 302 http://127.0.0.1:51234/auth/callback?code=…&state=<random>.51234
```

`state` is attacker-influenceable, so the suffix must parse as a plain decimal
port in 1–65535 (no signs, no whitespace, no leading zeroes, no hex, no
non-ASCII digits) and the destination host is the constant `127.0.0.1`. Anything
else dead-ends on an error page rather than becoming an open redirector carrying
a live authorization code.

