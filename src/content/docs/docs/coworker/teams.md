---
title: "Coworker teams"
description: "A team is a lead and the workers it staffs, working one piece of work over a board. The lead plans, staffs, assigns and checks. The workers do the work…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

A team is a lead and the workers it staffs, working one piece of work over a board. The
lead plans, staffs, assigns and checks. The workers do the work and answer for it with
evidence in a journal. You approve the plan and the roster, and anything consequential a
worker wants to do still reaches you, as it would from any coworker.

Two teams ship.

| Lead | The workers it staffs | Hand it |
|---|---|---|
| **DevSecOps Lead** | **AppSec** (code review and fixes), **Secrets** (the working tree and the full git history), **Posture** (Terraform and read-only cloud), **Deps** (vulnerable dependencies and the smallest upgrade that closes each) | a security engagement: *Review this repository for security issues and fix what matters.* |
| **SWE Lead** | **SWE** (implements items), **Test** (verifies them against their criteria), **Design** (layout, styling and interaction) | a piece of software work: *Add CSV export to the reports page, with tests.* |

A lead coordinates and does not build: the two leads have no shell and no git, on
purpose. Workers are not in the composer's picker, because a worker started on its own has
no lead and no board. **Settings ▸ Coworkers** keeps them under **Team workers**, where you
can read each one's instructions or switch it off. A lead cannot staff a worker that is
switched off.

## Running one

1. **Pick the lead and a folder.** Choose *DevSecOps Lead* or *SWE Lead* in the composer's
   picker, and the project folder. The board belongs to that folder and outlives the
   conversation, so the next piece of work there starts from what this one left.
2. **Ask for the outcome.** One sentence is enough. The lead reads enough of the project to
   scope it, and checks the board for anything left from an earlier run. It cancels or
   reassigns stale items rather than filing them twice.
3. **Approve the plan.** The first card is *Approve the proposed work items?* Each item has
   a short description and one to three acceptance criteria that a verifier can pass or
   fail: "no verified secrets in git history", not "the scan was run". Decline it with what to
   change and the lead revises it. The DevSecOps Lead ends its plan with the report that
   rolls the findings up.
4. **Approve the roster.** The second card is *Create this team?*: which workers, on which
   model, and why each is there. Decline it with a note and the lead hears why. Approving
   it starts the workers.
5. **Let it work.** Workers take their items and move them through *in progress*, *blocked*
   and *review*, journalling what they found and the evidence behind it. The lead checks in
   on a timer and wakes when something changes on the board. A check-in that finds nothing
   new says so in a line at most, and once every item is done it stops checking in.
6. **Read the result.** At review the lead checks each item against its criteria, on
   evidence rather than on the worker's say-so. A fix is re-checked by a worker who did not
   write it, and the Test Worker verifies what a builder handed over; nobody grades their
   own work. What does not hold goes back with a precise comment. When everything is done,
   the lead reports once: what was found, what was fixed, and what needs your decision.

![The board, expanded: a security engagement's items by state, each with who holds it, and a blocked item open beside them with what it is waiting for and when it counts as done.](/docs/images/board.png)

## The board and the journal

The board is in the conversation's side panel: the items grouped by state, blocked ones on
top. Expand it for every item and each item's timeline, where you can pass an item or send
it back yourself with **Mark done** or **Request changes…**.

Findings and their evidence (scanner output, file and line, how to reproduce) go in the
journal, and the board carries references to them. Both are hash-chained records: see
[Audit](/docs/coworker/security/#audit) for what that proves and how to check it.

## While you are away

A lead does not need you watching. Start one from an automation and it plans and staffs
exactly as it would in a conversation, and the two cards wait in the **Inbox** until you
answer them. Each worker asks for anything consequential the way any coworker does: in its
own conversation if you have it open, otherwise in the Inbox.

## Secrets stay out of the record

A security team finds secrets; that is its job. It records each one by its kind and where it
lives, a file and line or a commit, never by its value, and a secret found in the history is
reported as *rotate first, then purge*. The board and the journal refuse a write that
carries a credential's value, whoever makes it, so a worker that forgets is told to record
the location instead. [Secrets](/docs/coworker/security/#secrets) says what that check catches and what
it does not.

## Scanners, and what they could not check

The security workers drive open-source scanners (semgrep, gitleaks, trivy, checkov,
osv-scanner and the ecosystems' own auditors) rather than replacing them. A scanner that is
not installed is asked for; if you decline, the worker does the check by hand and says so.
Every report ends with a **Coverage** note listing which checks ran, with what, and which
were done by hand or not at all, so "we could not look" never reads as "nothing there".
Semgrep runs with its metrics off, and gitleaks redacts what it finds before the worker
reads its report.

## Models

Both leads and every worker recommend Claude Fable 5.1, Claude Opus 5.5 and GPT-5.6 Sol. The
lead picks a model for each worker on the roster, and the card shows which. Security work
needs a model that will do defensive work; see [Models](/docs/coworker/using-remit/#models).
