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
| `limits.max_iterations` | cap | steps per turn |
| `limits.external_budget` | cap | actions with effects beyond the machine per turn |
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
overlay that would loosen is refused **whole**, and the reason names the key. Every version
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
