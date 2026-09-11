---
title: "Remit Cloud"
description: "The hosted service behind Remit: one deployment, many organisations, each governing its own fleet of coworkers."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

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

## In this section

- [Organisations](/docs/cloud/organisations/) — registration, roles, invitations, and what is separated between organisations.
- [The console](/docs/cloud/console/) — the six screens, and the rule that none of them can lower a protection.
- [Policy](/docs/cloud/policy/) — the controls, what "tighter" means for each, issuing and break-glass.
- [What the server holds](/docs/cloud/evidence/) — and what it never does.
- [Threat model](/docs/cloud/threat-model/) — five attackers, what each can and cannot do.
- [Curating the gallery](/docs/cloud/gallery-curating/) — writing a coworker, publishing it, and the review it goes through.
