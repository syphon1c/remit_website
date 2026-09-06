---
title: "Billing"
description: "The product enforces one field: org.plan. Everything about money lives outside this binary and reaches that field through one narrow door."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

The product enforces one field: `org.plan`. Everything about money lives outside this
binary and reaches that field through one narrow door.

## The boundary, and why it is where it is

Nothing in the request path calls anything in `internal/billing`. Three things follow, and
all three are worth more than the convenience of not keeping the line:

- **The product works when billing does not.** A provider having an outage cannot stop a
  fleet being governed or an organisation being administered.
- **An invoiced deal and a card payment are the same act.** Most organisations buying
  something like this want a purchase order and net-30, not a card form. Both end as one
  call with an actor and a reason.
- **A provider's webhook is just another caller**, and one that must say who it is. It moves
  one column and can reach nothing else.

**A plan limits the service, never a protection.** Seats, machines, how long the record is
kept. An expired plan refuses administrative *writes* and nothing else: the fleet stays
governed, evidence keeps arriving, documents already issued stay served, and every floor in
Remit works signed out, offline and unlicensed. If a change here could make a fleet less
safe, the change is wrong.

## There is no role above owner, so a plan is not an API

No support tier can read an organisation's records from the inside — that is a deliberate
property, and adding a super-admin so plans could be administered would trade it for a
convenience. A plan is *our* relationship with an organisation, not something the
organisation sets. So it arrives from outside the request path entirely:

```bash
remit-cloud plan show acme
remit-cloud plan set acme enterprise gareth@scapecom.com "invoice 2026-114 paid by bank transfer"
remit-cloud plan link acme cus_QK3f9…
```

Whoever runs this already has the database. That is the point: it grants nothing new.

A **reason is required**, for the same purpose break-glass requires one. The question "why
is this organisation on that plan" arrives months later, usually when somebody disputes a
charge or an expiry, and the plan column alone cannot answer it. Every change is kept with
its actor, its reason and its source, is on the policy chain, and is an evidence event the
organisation can see for itself.

## Stripe

Yes — Stripe is what "payment provider" means here, and the integration is one webhook.

```toml
[billing]
stripe_webhook_secret = "whsec_…"          # empty: the route is not mounted at all

[billing.plans]                             # a price's lookup_key → a plan
remit_enterprise_annual = "enterprise"      # US$200 per organisation per year, the one paid plan
```

Point a Stripe endpoint at `POST /v1/billing/stripe` for the `customer.subscription.*`
events, then link each organisation to its customer with `remit-cloud plan link`.

Four decisions are already made, and made visibly rather than buried in a signature check:

| Situation | What happens | Why |
|---|---|---|
| `active` or `trialing` on a mapped price | that plan | the ordinary case |
| `canceled`, `unpaid`, subscription deleted | `expired` | and expiry only pauses administration |
| `past_due` | **nothing** | a card that failed once is usually a card that will be retried; expiring an organisation the same hour loses a customer over an expiry date rather than a decision |
| a price nobody mapped | **nothing** | guessing which tier somebody paid for is how an organisation silently gets what it did not buy |

**Prices are mapped by `lookup_key`, not by price id.** Price ids differ between the test
and live accounts and change whenever a price is superseded, so mapping on them means a
deploy every time somebody edits a price.

The signature is verified by hand — no vendor library in this binary, same as every other
integration — over the raw bytes, within a five-minute window in both directions, and
accepting any of several `v1` signatures so an endpoint secret can be rotated without
dropping events. Everything after verification answers 200 even when it does nothing: a
provider retries a non-2xx for days, and an event about an account we have never heard of is
not something a retry fixes.

### Test mode, and confirming the event shapes

Set `live_mode` so a test secret in a production configuration is caught rather than acted
on. Test and live have different signing secrets, so a test event cannot normally verify
against a live endpoint — this catches the one case that slips through, which is somebody
pasting the wrong secret.

```toml
[billing]
live_mode = true
```

Unset accepts either and warns at startup.

**Confirming the shapes takes five minutes**, and the confirmation becomes permanent:

```sh
stripe login
stripe listen --forward-to localhost:8443/v1/billing/stripe --print-json > events.jsonl
```

`stripe listen` prints the endpoint's signing secret on its first line; that is what goes in
`stripe_webhook_secret` for the run. Then, in another terminal:

```sh
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

`stripe trigger` makes its own products, which have no `lookup_key` — so the plan mapping
needs a price with one:

```sh
stripe products create --name "Remit Team"
stripe prices create --product prod_… --unit-amount 4900 --currency aud \
  --recurring.interval month --lookup-key remit_team_monthly
stripe customers create --email test@example.com
stripe subscriptions create --customer cus_… --items.0.price price_…
```

Split `events.jsonl` into one file per event and drop them into
`internal/billing/testdata/stripe/`, keeping the existing names. `TestFixturesDecodeAsExpected`
reads whatever is there, so a real capture replaces a documentation-derived one with no code
change — and a field Stripe moves or renames later shows up as a failing test rather than as
a plan that quietly stops moving.

The fixtures committed today are built from Stripe's own reference for the Event and
Subscription objects. They confirm the decoder against the documented shape, which is the
best available without an account, and they are not the same as seeing the real thing.

## Who is the seller: Stripe, decided

Stripe was chosen over a merchant of record (Paddle, Lemon Squeezy) on 2026-09-03. The
consequence is worth writing down where somebody will read it, because it is not a code
consequence.

**With Stripe, the seller is you.** Registering and remitting sales tax wherever your
customers are is yours to do. Stripe Tax calculates; it does not register or file. Selling
B2B software from Australia, that means Australian GST, and a patchwork that grows with each
country you sell into. A merchant of record would have become the seller and taken that on,
at a higher percentage and with weaker support for the invoiced, net-30, purchase-order
buying that enterprise procurement actually uses — which is the buying this product's price
point implies, and the reason the decision went the way it did.

Take advice on the obligation itself; this page is about where the code's boundary sits, not
about your tax position. **Nothing in the code depends on the choice**: a merchant of record
would have been a different webhook into the same `SetPlan`, and that stays true if the
decision is ever revisited.

## What is not built

- **No checkout.** Nothing here creates a subscription, and Stripe's own hosted checkout or
  payment links are the shorter path than building one.
- **No customer portal.** Stripe's is a URL.
- **No invoices, dunning or proration.** All of that is the provider's, and belongs there.
- **The event mapping is checked against the documented shape, not against a live account.**
  See "Test mode" above for the five minutes that closes that gap permanently.
