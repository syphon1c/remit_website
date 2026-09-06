---
title: "Remit Cloud"
description: "The hosted service behind Remit: one deployment, many organisations, each governing its own fleet of coworkers."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

The hosted service behind Remit: one deployment, many organisations, each governing its own
fleet of coworkers.

This page is the map. Every claim below is expanded in a page of its own, and each of those
says *why* as much as *what* — the reasoning is the documentation, because the obvious
implementation is wrong often enough to be worth writing down.

---

## The three ways to run Remit

| | Policy | Gallery | Cost |
|---|---|---|---|
| **Standalone** | none — the machine is its own authority | the coworkers built in | free |
| **Standalone + a self-hosted broker** | none | a shared gallery your team runs | free |
| **Remit Cloud** | your organisation's, signed and enforced | a private gallery plus ours | a subscription |

**Every protection is identical in all three.** The permission ladder, the hard floors, the
outside-content rule, the blast-radius bound, workspace trust, the audit journal — all of it
works signed out, offline and unlicensed. A subscription buys what one machine *cannot* do:
policy shared across a fleet, an evidence record an organisation can prove things from, a
gallery its people share, and a place to see it all.

Nothing in any tier lowers a floor. Policy composes by **intersection** and may only
tighten; a document that would widen one is refused by the runtime, not discouraged in a
console. That is the sentence the whole product is built to keep true.

---

## Where to start

| If you want to | Read |
|---|---|
| put this on a server | `../deploy/README.md`, then [deployment.md](/docs/self-hosting/cloud-deployment/) |
| understand the security posture | [threat-model.md](/docs/cloud/threat-model/) |
| know what this server holds about people | [evidence.md](/docs/cloud/evidence/) |
| write a policy | [policy.md](/docs/cloud/policy/) |
| run it day to day | [operations.md](/docs/self-hosting/cloud-operations/) |
| take it to production | production-readiness.md — the ordered list of what stands between today and a paying organisation |

---

## The pieces

### Identity and organisations

- **[auth.md](/docs/cloud/auth/)** — how the server decides who is calling. Two modes: `none`, which
  issues its own tokens and asserts nothing, and `oidc`, which validates a real provider's.
  Also the userinfo fallback, and the rule that an address the provider has not verified
  establishes nothing.
- **[organisations.md](/docs/cloud/organisations/)** — registration, roles, invitations that carry no
  token, and exactly what is separated between organisations and what is shared. Also why
  there is nothing above `owner`, which was a decision rather than an omission.

### Governance

- **[policy.md](/docs/cloud/policy/)** — the lattice: twenty-two keys, four shapes, and what "tighter"
  means for each. Issuing, signing, staleness, break-glass.
- **[evidence.md](/docs/cloud/evidence/)** — one page on what this server holds and what it does not.
  No message, no prompt, no tool argument, no reason text: the schema has nowhere to put
  them, and tests on both sides try to smuggle them through.
- **[threat-model.md](/docs/cloud/threat-model/)** — five attackers, what each can do, what each
  cannot, and the property that keeps the second true. Re-read it whenever a change touches
  trust; if a line stops being true, the change is wrong.

### The gallery as a supply chain

- **[sharing.md](/docs/cloud/sharing/)** — publishing a coworker, the human review queue, and why
  approving from a filename is not review.
- **[gallery-curating.md](/docs/cloud/gallery-curating/)**, **[gallery-deployment.md](/docs/cloud/gallery/)**
  — the curator's and the operator's sides.

### Running it

- **[deployment.md](/docs/self-hosting/cloud-deployment/)** — the principles: locking an origin to its CDN, which
  proxies to believe, TLS with a client certificate, an encrypted database link, and
  backups you have actually restored.
- **../deploy/README.md** — the runbook and the artefacts: a systemd
  unit, a production config, and scripts for the Cloudflare ranges and the backups.
- **[operations.md](/docs/self-hosting/cloud-operations/)** — the database, the signing keys, releases, telemetry,
  managed connectors, the relay, policy, evidence and export. How desktop updates and this
  server's own deploys work end to end — the poll, the channels, the pipeline, the three
  credentials — is explained in the runtime's `docs/how-updates-work.md`.
- **[key-custody.md](/docs/self-hosting/key-custody/)** — three keys, three answers. The updater key is
  offline and the code refuses it by name; the other two are encrypted at rest or behind an
  external signer. Rotation, and why a key that cannot be rotated is a key whose theft never
  ends.
- **[console.md](/docs/cloud/console/)** — the browser administration surface, and how a browser holds
  a credential it cannot read.
- **[billing.md](/docs/cloud/billing/)** — one field, one narrow door, and why nothing in the request
  path knows about Stripe.
- **[api.md](/docs/developers/cloud-api/)** — the route table, which is the contract.

---

## Things that are true everywhere, and worth knowing once

**Fail closed on governance paths.** A check that cannot determine an answer reaches a
person. A reviewer's verdict parses to "unsure" on doubt. A count that cannot be taken is
not a licence to exceed a limit.

**Wire compatibility is law.** Routes, JSON keys, status codes and on-disk formats that
clients depend on do not change. It is why the state directory is still `~/.config/coworker`
and why a single-tenant deployment behaves today exactly as it did before organisations
existed.

**No vendor SDKs.** Every integration — Auth0, Slack, GitHub, S3's SigV4, Stripe's webhook
signature — is hand-rolled `net/http` and standard library. It keeps the binary small, the
dependencies few, and the security-critical parts testable without an account.

**404, not 403, on `/v1/admin`.** Somebody with no part in administering an organisation has
nothing to act on either way, and "forbidden" tells them the surface is there.

**Every governed act is on a hash chain** with its actor, and an organisation can read its
own. `remit-cloud verify` checks those chains, which is how a restored backup is tested
rather than assumed.

---

## The state of it, September 2026

**Built and tested**, including live runs against a real identity provider: organisations,
membership and invitations, the policy lattice and its enforcement, evidence and its export,
the fleet inventory, SCIM, break-glass, the gallery and its review queue, the browser
console, plans and their limits, the Stripe webhook, key custody and rotation, and full
separation between organisations.

**Running**, since 2026-09-03, at `https://api.remit-ai.app` with the console at
`https://console.remit-ai.app`: one instance, Postgres on the same box, the origin
firewalled to Cloudflare, `oidc` against a development identity provider. Since 2026-09-05
the server deploys itself from a tag through a restricted key (`deploy/README.md`), and the
desktop releases itself from a tag through a canary organisation and a manual promote
(the runtime's `docs/releasing.md`); Remit 0.2.3 is on the public update channel and was
taken through the updater on a real machine.

**Not yet production.** production-readiness.md is the ordered
list. The first tier: backups that run and have been restored, a production identity
provider, the origin closed with a client certificate, outbound mail, a public download
page, Apple notarization, the legal documents, monitoring that reaches a phone, a managed
database, and a staging environment. Three are done as of 2026-09-06: backups run
nightly, sealed and shipped off the box, with one restore rehearsed; outbound mail goes
through Cloudflare Email Service; and `/download` is the public download page. Monitoring
is planned next.

`.claude/tasks/todo.md` is the working plan and carries the detail.
