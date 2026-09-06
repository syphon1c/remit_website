---
title: "Organisations"
description: "Who a request belongs to, and who may administer them."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

Who a request belongs to, and who may administer them.

## Registering

```
POST /v1/orgs   {"slug": "acme", "name": "Acme"}
```

The caller must be signed in with an address **the identity provider verified**. An
organisation whose owner is an address nobody has proven they hold is an organisation
anybody can take, so this is refused with `email_unverified` and the provider's own verdict
in the reason. Omit `slug` and one is offered from the name.

The registrant becomes its `owner` on a fourteen-day trial. One organisation per address:
somebody who already belongs anywhere is refused with `already_taken`, so that "whose
policy is this request inside" has exactly one answer and never becomes a guess.

## Roles

| Role | May |
|---|---|
| `owner` | everything, including deleting the organisation, changing its plan, and making other owners |
| `admin` | operator: policy, the gallery queue, fleet, evidence, members, invitations |
| `member` | nothing administrative — the coworker, under the organisation's policy |

There is deliberately nothing above `owner`: no support role can read an organisation's
records from the inside. An organisation always keeps at least one owner; removing or
demoting the last one is refused with `last_owner`.

Where an organisation has members, membership decides operator status and `[auth] operators`
is not consulted. That allowlist remains for storeless deployments and for a single-tenant
box that has registered nobody, so adding an admin is not a config edit and a restart.

## Inviting

```
GET    /v1/admin/invitations
POST   /v1/admin/invitations   {"email": "kit@acme.example", "role": "admin"}
DELETE /v1/admin/invitations/{email}
```

When the deployment has a `public_url`, the response carries `join_link` and the mail
carries the same: `remit://join?gallery=<host>` — the address as a person would type it,
`api.remit-ai.app`, not percent-encoded, because mail clients auto-link the middle of an
encoded URL and break it. Clicking it opens Remit on "join a gallery" with this address
filled in — and nothing else: the app asks the deployment what it is, shows what it found,
and the person presses Sign in. Without Remit installed it does nothing, which is why the
mail leads with the steps — get Remit at `<host>/download`, choose Remit Cloud Enterprise,
enter the address, sign in — and shows the link second. The mail still carries no web link
and no token.

**There is no token in an invitation and none in the mail.** Accepting one is signing in
with that address and having the identity provider say it is verified. So there is nothing
to steal from an inbox, nothing to replay, and a link in a phishing message cannot enrol
anybody: the proof is the provider's, not ours. The invitation is the row, not the message,
so an organisation with no `[smtp]` configured still has a working invitation — the reply
says `notified: false` and an admin passes the news along.

An invitation stands for fourteen days, is consumed when accepted, and can be withdrawn
until then. Inviting an address that already belongs somewhere is refused — and the
refusal says "another organisation", never which: one tenant does not learn another's
name from a failed invitation. Where two organisations have invited the same address, the
first verified sign-in joins the one that asked first, and the other's invitation is left
standing for its admins to withdraw. Re-inviting somebody is how "resend" works, and it
is not a new seat.

Only an owner may invite an owner, promote one, demote one or remove one: who the owners
are is the owners' decision in both directions.

## Members

```
GET    /v1/admin/members
PUT    /v1/admin/members/{email}   {"role": "member"}
DELETE /v1/admin/members/{email}
```

Every change is on the policy chain with the actor, and in the evidence record. Removing
somebody does not break their coworker: from its next sign-in it is inside no organisation
and therefore under no policy, which is the free product, not a punishment.

## Belonging to no organisation

A signed-in identity with no membership is exactly a person using the free product against
a shared gallery. They read the gallery. Everything organisation-scoped answers **404** —
the same answer a broker without the route gives, which the coworker already handles as
"nothing to do, nothing wrong". `GET /v1/connections` is the one exception and answers with
an empty list: the coworker asks after every sign-in, and a 404 there becomes an error in
its log for a question whose answer is "none".

## What is separated, and what is shared

One deployment, many organisations. Company X administers only its own people, policies,
data and coworkers; company Z the same; neither can see the other.

**Private to an organisation.** Policy documents and their chain. The evidence record and
its anchors. The fleet inventory. Connections and relay routes. Members and invitations.
SCIM users and groups. The release hold. Telemetry. The plan and its history. Its own
gallery, its own review queue and the record of what it approved, and its own install
counts.

**Shared across the deployment.** One gallery we publish, which every organisation
additionally sees — that is how a Remit-built coworker reaches customers at all. **An
organisation's own coworker wins a slug clash**, because somebody who published `triage`
inside their organisation meant theirs, and a shared coworker of that name appearing later
must not silently replace it under them.

**One deployment, one identity provider and one signing key.** A key per organisation would
mean every runtime pinning a key it cannot know in advance; what separates organisations is
which coworkers they can *see*, not which key signed them. A per-organisation identity
provider is still to come.

```toml
[gallery]
dir             = "/srv/remit/shared"    # every organisation sees this
pending_dir     = "/srv/remit/shared-queue"
org_dir         = "/srv/remit/orgs"      # one directory per organisation, by slug
org_pending_dir = "/srv/remit/queues"    # one queue per organisation
```

Leave `org_dir` empty and there are no per-organisation galleries: one gallery, one queue,
every identity inside the configured organisation. That is what a box serving one team has
always had, and it is unchanged.

`org_pending_dir` must not be inside `org_dir`, for the same reason `pending_dir` must not
be inside `dir`: a queue that is served is a queue whose unreviewed coworkers are
installable.

## There is nothing above owner, and that was a decision

A deployment-wide system administrator — somebody who could see or administer every
organisation from inside the product — was considered and **rejected** on 2026-09-03.

The cost is real and worth stating: supporting a customer means asking them what their
policy says, because there is no way to look. That cost is what the claim is made of.

## Plans and the trial

`plan` is a label, not a permission. A new organisation is on `trial` for fourteen days.

**Nothing about a plan touches a protection.** Every floor in Remit works signed out,
offline and unlicensed, and no plan, tier or expiry may widen one. What a plan limits is
the service: seats, enrolled machines and how long evidence is kept.

| Plan | People | Machines | Evidence kept |
|---|---|---|---|
| trial | 5 | 10 | 30 days |
| enterprise | — | — | — |

Seats count members **and pending invitations**: an invitation is a seat somebody is about
to occupy, and counting it only on acceptance would let an organisation invite a hundred
people and discover the limit one sign-in at a time, with a hundred people already told
they were in. A machine over the limit is not counted, not stopped: it goes on working and
goes on enforcing the policy it holds, and its evidence still arrives. Retention is a
ceiling, never a floor — an organisation may always keep less.

A deployment with no membership at all — a development box, or a single-tenant install —
is **unmetered**. Plans exist where membership does.

When a trial expires, administrative **writes** are refused with the reason. Reads stay
open, documents already issued stay signed and served, and a runtime keeps the last
document it admitted — including its `on_stale` overlay once `max_age` passes. Evidence and
heartbeats keep arriving, because refusing them would lose the record of exactly the period
somebody is most likely to ask about later. A floor never moves because a bill did.

## What the coworker sees

`GET /v1/me` carries the organisation when there is one:

```json
{
  "user": {"user_id": "auth0|…", "email": "kit@acme.example", "name": "Kit"},
  "org":  {"slug": "acme", "name": "Acme", "plan": "trial", "role": "admin",
           "trial_ends_at": "2026-09-17T01:47:50Z"}
}
```

Absent means "inside no organisation", which is not an error. The coworker uses it to say
whose policy it is under, and to offer its admins the console.
