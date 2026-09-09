---
title: "Policy, for administrators"
description: "A policy is a signed document your organisation issues to its runtimes. It constrains: it can narrow an allowlist, forbid a mode, cap a budget, block a…"
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

A policy is a signed document your organisation issues to its runtimes. It **constrains**:
it can narrow an allowlist, forbid a mode, cap a budget, block a connector, lock a knob. It
never grants. It cannot trust a workspace, connect a connector, install a coworker, or hand
a machine more than the machine already permits. Nothing in a policy, and nothing in this
service, lowers the protections built into Remit — those work signed out, offline and
unlicensed, and a policy composes *with* them.

The full specification, with the reasoning, is `.claude/tasks/specs/policy.md`. This page
is the working reference.

## How composition works

Every key has a shape, and the shape says what "tighter" means. A runtime meets its own
settings with every document that applies to it — the org's, and one per group the person
is in — and the result is at least as tight as each of them. Order never matters.

| Shape | Tighter means | Present and empty means |
|---|---|---|
| allow set | a subset | nothing allowed |
| block set | a superset | nothing blocked |
| cap | smaller | — |
| lock | `true` | — |
| permit | `false` | — |

An absent key is no constraint. The one exception to "never sets" is
`model.proxy_url.default`: applied only when the machine has no proxy, and only to a URL the
policy already allows.

## The keys

| Key | Shape | What it constrains |
|---|---|---|
| `egress.allowed_domains.only` | allow set of hosts / `*.suffix` | destinations reachable without asking |
| `permission.allowed_modes` | allow set of modes | `discuss`, `plan`, `interactive`, `custom`, `auto-approve`, `bypass-approvals`; a forbidden mode falls to the highest permitted below it |
| `permission.auto_allow.only` | allow set of tool names | what `custom` mode may auto-allow |
| `commands.allowed.only` | allow set of command prefixes (`git *`) | the shell allowlist |
| `overrides.lock` | lock | a person may tighten a tool's risk class, never relax one |
| `unattended.allowed` | permit (`false` is tighter) | whether approvals may be routed to the Inbox |
| `standing.allowances.allowed` | permit (`false` is tighter) | whether a person may teach a coworker something it may always do |
| `reviewer.separate` | lock | the model that judges an approval must not be the model doing the work |
| `limits.max_iterations` | cap | steps per turn |
| `limits.external_budget` | cap | actions with effects beyond the machine per turn |
| `limits.tokens_per_hour` | cap | tokens one session may spend in a rolling hour; the one cap that also switches a control on |
| `model.allowed.only` | allow set of `provider/model` | models a coworker may use |
| `model.proxy_urls.only` | allow set of URLs | where model traffic may go |
| `model.proxy_url.default` | provisioning | the proxy to use when the machine has none |
| `connectors.allowed.only` | allow set of connector ids | what may be connected |
| `connectors.tools.disabled` | block set of `connector.tool` | tools switched off |
| `mcp.servers.allowed.only` | allow set of `{catalog}`, `{url}`, `{command}` | MCP servers; a `url` may end in `/*` to cover everything under that path on that host; an allowlist of URLs blocks every local process |
| `mcp.tools.disabled` | block set of `server:tool` | MCP tools switched off |
| `skills.sources.allowed` | allow set of `gallery`, `persona`, `local` | where a skill may come from |
| `skills.allowed.only` | allow set of `{name, sha256}` | skills by content |
| `personas.sources.allowed` | allow set of `builtin`, `gallery`, `local` | where a coworker may come from |
| `personas.allowed.only` | allow set of `{gallery_slug, manifest_hash}` | coworkers by content |
| `personas.revoked` | block set of slugs | coworkers withdrawn from the fleet |
| `personas.require_signature` | lock | only signed coworkers install |
| `server.loopback_only` | lock | the local server binds loopback only |
| `workspace.trust.roots.only` | allow set of absolute roots | where a workspace may be trusted |

Two optional sections outside `keys`: `evidence` (`{events, anchors, interval}`) opts a
runtime into sending content-free evidence, and `fleet` (`{heartbeat, interval}`) into the
inventory heartbeat.

### Standing allowances

A standing allowance is a rule a person taught: pinned from an approval card, one tool
against one exact target — an issue in one repository, an email to one address — and then
honoured in every session and every mode until that person removes it. It is how somebody
teaches a coworker what is acceptable, and it is deliberately narrow. There are no
wildcards and no tool-wide entries, exec and destructive tools can never carry one, and a
card inside an automation run pins its rule to the automation instead.

`standing.allowances.allowed` is **on unless you turn it off**, and it is one switch. This
service does not manage the allowances themselves. A fleet-wide list of everybody's
`tool → target` rules would be large, would change every day and would need somebody to
tend it; what an administrator actually decides is whether people at this organisation may
teach their coworkers at all. That is the switch, and it can be turned back on.

Off, an approval card stops offering "Allow every time", and an attempt is refused with the
key named and downgraded to approving that one call, audited either way. **It does not
un-teach.** Allowances taught before you turned it off keep working, and the person who
taught each one removes it on their own machine, under Settings ▸ Security & trust ▸
Standing allowances. A policy tightens what a machine may newly do; it does not reach in
and delete what somebody has already decided. If you need one gone, ask the person.

An allowance is bounded by every other key regardless. It decides that one call runs
without asking; it cannot conjure a tool `connectors.tools.disabled` switched off or
`connectors.allowed.only` never permitted, and it does not raise `limits.external_budget` —
past that allowance the turn comes back to a person whatever it has been taught. Owner
ruling, 2026-09-08.

## Issuing

```
PUT /v1/admin/policy                      the org
PUT /v1/admin/policy/groups/engineering   one group
```

with a draft:

```json
{
  "keys": {
    "egress.allowed_domains.only": ["*.acme.example", "api.github.com"],
    "permission.allowed_modes": ["discuss", "plan", "interactive", "auto-approve"],
    "limits.external_budget": 8,
    "overrides.lock": true
  },
  "on_stale": {"permission.allowed_modes": ["discuss", "plan", "interactive"]},
  "evidence": {"events": true, "anchors": true},
  "fleet": {"heartbeat": true}
}
```

A draft with a key the lattice does not know, a value of the wrong shape, or an `on_stale`
overlay that would loosen is refused **whole**, and the reason names the key.

**A runtime does the same thing, which is the one trap here.** An endpoint too old to know
a key refuses the whole document carrying it and keeps the rest of the set — so issuing a
newly added key to a fleet that has not all updated drops that document's *other*
constraints on the older machines — including the ones it held under the previous version,
because the set it fetched no longer contains that version. Every machine reports which keys
its build understands in its heartbeat, and the review card says, before you issue, which
machines will refuse a rule you are adding and that the rest of the document goes with it.
A machine from before the heartbeat carried that list is counted as "cannot tell". Watch
for `policy_refused` on the Record page after issuing all the same. The keys added on
2026-09-08 — `standing.allowances.allowed`, `reviewer.separate` and `limits.tokens_per_hour`
— need an endpoint from 2026-09 or later. Every version
is signed with the org's policy key and recorded on the policy chain with the operator's
name. `GET /v1/admin/policy/versions` lists them.

## What a runtime does with it

It fetches at launch, at sign-in and every fifteen minutes (or sooner if the document asks), verifies
the signature against the key it pins, refuses whole any document it cannot verify or
order, and meets the rest with its own settings. Past `max_age` — seven days by default —
the `on_stale` overlay applies on top: something may close, nothing opens. A tightened rule
applies on fetch; a widened allowance applies at the runtime's next start.

Every denial a policy causes says so, in the interface and on the audit row: "Blocked by
*acme*'s policy (egress): … Policy org v3, confirmed 2 hours ago." The Settings pane lists
which settings the organisation set.

## Break-glass

`POST /v1/admin/breakglass {group, reason, minutes}` suspends one group's document for at
most eight hours, so the org's document alone applies to that group. It removes exactly
one layer of tightening: never the org document, never a machine's own settings, never a
protection built into Remit. It ends on its own or with `DELETE`, and every open and close
is on the policy chain and in the evidence record.
