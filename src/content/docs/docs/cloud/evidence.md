---
title: "What this server holds, and what it does not"
description: "One page, because the answer to \"what does Remit Cloud see\" should not need more."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

One page, because the answer to "what does Remit Cloud see" should not need more.

## It never holds

- A message, a prompt, a document, a file, a page, an email body, a tool's arguments, a
  tool's result, or the reason text on any decision.
- A connector token. A token passes through the OAuth callback once, on its way to the
  desktop's loopback, and is never written; the `connection` table has no column for one,
  and a test asserts it stays that way.
- A case name or a session id. Chain anchors carry a hash of the case id; evidence events
  carry a hash of the session id.
- Anything a runtime sends that the schema does not name. Unknown fields refuse the whole
  batch.

## It holds

| Record | What is in it | Why |
|---|---|---|
| Org, people, connections | slugs, names, email addresses, IdP subjects, which connector, which account id, routing metadata | so a person's own connections restore and their events route to them |
| Policy documents and their chain | the constraints, who issued them, when; a hash chain of every change | so a fleet has one policy and a rewrite is detectable |
| Evidence events | the *kind* of governed thing — an approval and how it went, a reviewer verdict, an auto-allow, a person teaching a coworker a standing allowance or removing one — the risk class, the policy key, a tool's name, a session's hash, the time, the person and their groups | so an organisation can prove what happened without holding what was said. A taught allowance names a target on the machine; here it is the tool and nothing more |
| Chain anchors | which chain, how far, its head hash, when | so a rewritten or rewound local journal is detectable as a fork |
| Fleet inventory | device id, build, OS, policy ids held, installed coworkers by id and hash, connected connector ids, which policy keys the build understands, how many rules people have taught there | so compliance is a question with an answer, and a key is not issued to a fleet that would refuse it |
| Gallery | published coworkers, their signatures, the review queue and its scan findings, install counts | the shared gallery is what one machine cannot do |
| Telemetry | counts per day, persona family, version and platform | never who |

Retention is per org, legal hold suspends the sweep, and export to Splunk, Sentinel and S3
carries the same rows and nothing more.

## The property, not the promise

The shape enforces it. The evidence decoder refuses unknown fields; the evidence table has
no text column that is not an enum, an identifier or a hash; the runtime's event type has
no field for content and its audit mapper drops free text before queueing. The tests on
both sides try to smuggle a reason, arguments, a raw session id and a case name through,
and none lands.
