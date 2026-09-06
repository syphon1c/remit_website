---
title: "Threat model, from the attacker's side"
description: "Five attackers, what each can do, what each cannot, and the property that keeps the second true. Written to be re-read whenever a change touches trust;…"
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Five attackers, what each can do, what each cannot, and the property that keeps the second
true. Written to be re-read whenever a change touches trust; if a line here stops being
true, that change is wrong.

## 1. A compromised Remit Cloud

**Can:** issue any policy document it likes; withhold documents; serve a stale or empty
gallery; drop relay events; lie in the inventory; read every content-free record it holds.

**Cannot:** widen what any runtime permits. Policy composes by intersection at the
endpoint and may only tighten; a document that would loosen is refused by the runtime, not
by this console. Cannot read work content, because none is here to read. Cannot sign a
coworker or a policy it does not hold the key for, and the keys are the custody decision made before release.

**Keeps it true:** the runtime's lattice and its whole-document refusal; the signed
document with a pinned key; the fact that nothing this server can say makes a runtime
depend on it — every protection works signed out.

**Net:** denial of service, visible and recoverable. Not escalation.

## 2. A compromised operator

**Can:** issue a tighter policy (and so deny people work); open break-glass for a group,
within eight hours and with a reason on the record; approve a coworker into the gallery;
revoke connections; change retention.

**Cannot:** widen a runtime past its own settings (same reason as above); approve a
coworker without the scan's findings beside it and the journal naming them; suspend the
org document (break-glass only suspends a group's); read content; disable the evidence
record of their own acts, which is on a hash chain they do not control the previous entries
of.

**Keeps it true:** every governance act on the policy chain with the actor; break-glass's
bounded shape; the gallery's human queue; SCIM de-provisioning of the operator account by
the identity provider. And the fact that an operator is an operator of ONE organisation:
its gallery, queue, policy, members, fleet and record are its own, and a deployment-wide
administrator who could reach across them was considered and rejected (2026-09-03,
`docs/organisations.md`). There is nothing above owner to compromise.

## 3. A compromised gallery publisher

**Can:** upload a coworker with an injection in a skill, a hidden instruction in markup, a
skill that names a connector the card never mentioned.

**Cannot:** publish it: the queue is human, and the scan puts the line in front of the
reviewer. Cannot forge the gallery's signature on it. Cannot reach a runtime whose policy
pins coworkers by hash or requires signatures. Cannot make an installed coworker do
anything the runtime's ladder and floors would not allow a person to do — and a turn
that begins from outside content is under the outside-content floor already.

**Keeps it true:** the scan as an aid to a human decision, not a substitute; signatures
over the exact bytes; `personas.allowed.only` and `personas.require_signature`; revocation
from one place once the mistake is found.

## 4. A compromised runtime

**Can:** ignore policy (it is the endpoint; nothing here can make it obey); send false
evidence; send a false heartbeat; stop sending.

**Cannot:** hide the divergence from the fleet for long: the heartbeat's policy ids are
checked against what the identity should hold, anchors that stop advancing or fork are
events, and evidence that stops arriving is a gap the analytics show. Cannot escalate any
*other* runtime. Cannot obtain a connector token it was not issued: the OAuth callback
delivers to the loopback of the machine that started the flow, and an installation token
is minted only for an installation the caller connected.

**Keeps it true:** per-user identity on every record; the content-free schema, so even a
lying runtime cannot leak content *through* this server; the relay routing by subject.

## 5. A stolen signing key

The one that matters.

**Policy key:** an attacker issues policies — but only tighter ones apply, so the damage
is denial of service until the key is rotated and the pinned public key replaced by
provisioning.

**Gallery key:** an attacker signs a malicious coworker. Runtimes that require signatures
would accept it — which is why the gallery key must never be the only control:
`personas.allowed.only` pins content, the queue is human, and revocation is one policy
change away.

**Updater key:** an attacker signs a malicious build. This is the catastrophic one, and it
is why release-time custody is a release blocker: HSM or KMS, offline, split as needed
(decision 6). Until then the dev keys are dev keys and the runtime says so in its config.

**Keeps it true:** custody, and rotation. `docs/key-custody.md` is the decision, per key:
the updater key cannot be loaded by a server at all — `internal/signer` refuses it by name,
so no configuration reaches it — and the two a server does hold are encrypted at rest or
behind an external signer whose every signature is checked against the pinned public key
before it is used.

Rotation is what turns a theft from permanent into recoverable. A runtime pins a SET of
keys, so a replacement can be published beside the key it replaces, the fleet can take it
up, and the old one can then be dropped — without stranding a machine or serving a document
nothing can verify. A key that cannot be rotated is a key whose theft never ends.

## Rate limits and abuse

Unauthenticated paths — the OAuth callback, the updater manifest, the webhooks, the
self-issued sign-in — are rate-limited per address, so a flood is a flood and not a way in.

**Which address, behind a proxy, is the whole question.** A forwarded header is believed
only from a connection that came from a network in `[server] trusted_proxies`; with none
configured, nothing is believed and the socket is used. Believing `X-Forwarded-For` from
anybody — which this server used to do — lets a stranger name a victim and fill that
victim's bucket, turning flood control into a targeted denial of service, while the attacker
rotates the header and meets no limit at all. This only holds while the origin is
unreachable except through the proxy: an attacker who can connect to the origin directly is
past every limit here regardless, which is why `docs/deployment.md` puts the firewall and
authenticated origin pulls first.
Webhooks verify a signature before parsing a byte. Bearer paths are bounded by the identity
provider's own controls and by SCIM de-provisioning, which refuses a bearer at the next
request.
