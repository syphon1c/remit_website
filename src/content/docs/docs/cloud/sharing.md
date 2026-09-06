---
title: "Sharing coworkers"
description: "How a coworker gets from somebody's machine into everyone's gallery, and what is checked on the way."
---

<p class="rm-synced">Part of the Remit Cloud documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>

How a coworker gets from somebody's machine into everyone's gallery, and what is
checked on the way.

- [Coworkers that carry skills](#coworkers-that-carry-skills) — what travels
- [Adding a persona by hand](#adding-a-persona)
- [Accepting contributions](#accepting-contributions) — uploads, review, the journal
- [The coworkers in personas/](#the-coworkers-in-personas)

## Coworkers that carry skills

A gallery install used to transfer exactly one thing: the manifest markdown.
That is the whole coworker when the coworker is only a prompt. It is a **silent
amputation** when it is not — `skills/` is behaviour, and a client handed only
the manifest would install something the author never tested, and report
success.

So a coworker laid out as a bundle directory with a sibling `skills/`:

```
personas/
  skilled-reviewer/
    manifest.md
    skills/
      triage.md
```

…is served as an archive instead. Its card carries `"bundle": true` and a
`bundle_hash`, and the client fetches `.../bundle`, verifies the hash, and
installs it through the same zip path a hand-shared bundle already used — same
strict parser, same install-time consent, same refusals. This adds a
**transport, not a trust path**.

The archive is byte-identical to what the desktop's own export produces:
`manifest.md` at the root, then `skills/…` sorted. Timestamps inside it are
fixed rather than the files' real mtimes, so the same coworker always produces
the same bytes and therefore the same hash — otherwise `cp` versus `cp -p`, a
redeploy or a restore from backup would change the hash and clients would refuse
installs for reasons nobody could diagnose.

Media is not included, because the desktop's export does not include it either:
it is a local presentation concern and has never travelled with a shared bundle.

A flat `<slug>.md` cannot carry skills — it has no directory of its own, and
treating the gallery's own `skills/` as its sibling would hand every flat
persona the same unrelated files.

### Older clients

A client says it can handle archives by sending:

```
X-Remit-Gallery-Caps: bundle
```

A capability, not a version: the broker should not have to know which build of
the worker grew which feature, and a fork advertises the same string the day it
implements the same behaviour. Absence means "no" — an unknown client is assumed
to be an old one, which is the safe direction.

Without it, a skills-carrying coworker is **omitted from the listing**, and
asking for its manifest directly returns `409 bundle_required`. Hiding a card an
old client cannot install correctly is the only honest option: there is no way
to say "this one needs a newer build" through a protocol that predates the idea.

This costs those clients nothing they previously had. Before bundles the broker
refused to serve skills at all, so no card disappears from a gallery that ever
worked, and no manifest that was ever served is refused now.

A coworker whose archive cannot be assembled — over the 8 MiB cap, or unreadable
— is refused **entirely** and logged, like any other bad manifest. Serving it
without its skills would be the exact failure this whole mechanism exists to
prevent.

## Adding a persona

Drop a manifest into the gallery directory and send `SIGHUP`:

```sh
cp my-coworker.md /srv/personas/
kill -HUP "$(pgrep -f remit-cloud)"
```

No restart, no dropped connections. Set `gallery.rescan_interval = "5m"` if you
would rather it poll.

A manifest is remit-ai's own format — YAML frontmatter plus a markdown body
that **is** the system prompt. Both layouts work: `<slug>.md`, or a
`<slug>/manifest.md` bundle directory (only the manifest is served; the client's
gallery install path fetches nothing else). See `personas/` for six worked
examples, all bundles, all of which parse cleanly under the client's strict
parser.

The card is built from frontmatter:

| Card field               | From                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| `slug`                   | `id:`, else the filename stem, slugified                          |
| `name` `icon` `tagline` `description` | the same keys                                        |
| `version`                | `version:` — a JSON number when numeric, else the string          |
| `family` `workspace`     | the same keys, else derived from `requires_folder`                |
| `publisher`              | `publisher:`, else `gallery.publisher`                            |
| `recommended_connectors` | `connectors:` ∪ the connector refs in `recommends:`               |
| `recommended_mcp`        | `mcp:` ∪ the mcp refs in `recommends:`; absent when empty         |
| `risk_summary`           | derived from `tools:` / connectors / MCP servers / `messaging:`   |
| `featured`               | `featured: true` — pins the card to the GUI's featured carousel   |
| `pitch_markdown`         | `pitch:`, else `description`, else `tagline` (detail view only)    |

`publisher`, `featured` and `pitch` are broker-only keys; the client's parser
ignores unknown frontmatter, so a manifest carrying them still installs cleanly.
Note that the GUI files any card whose publisher is not literally `Remit`
under its **"From your team"** tab — which is the right home for yours.

Refusals, all logged and skipped without taking the gallery down: no
frontmatter, unterminated frontmatter, invalid YAML, an empty body, a manifest
over 1 MiB, bytes that are not valid UTF-8 (they would break the client's hash
check after JSON encoding), and any `id:` outside the safe slug charset — the
slug becomes a URL segment here and a filename on the client, so a
traversal-shaped id is never served.

Warnings, logged and served anyway: a manifest that names a connector the
runtime does not ship, or one it lists but cannot connect yet, or an MCP
server outside its catalogue — in `connectors:`, `mcp:` or `recommends:`. The
client's parser does not validate these ids (a persona may recommend a
connector a newer runtime ships), so this log line is the only place a
mistyped or never-shipped id is caught before it becomes a chip on a card
for a connector nobody can connect. An MCP name may also be a catalogue id
plus a `-` or `_` suffix, because one catalogue row can stand for several
endpoints an operator configures separately (`databricks-sql`). The known ids
are carried in `internal/gallery/known.go` with the runtime commit they were
read from;
re-read the runtime when it adds a connector or a catalogue row. Warning
rather than refusal is deliberate: a stale list here must not take a
legitimate coworker down.

## Accepting contributions

Uploads are **off unless you turn them on**. A broker does not acquire a durable
write path — or a way for signed-in strangers to put files on its disk — by
being upgraded. Set a queue directory to opt in:

```toml
[gallery]
dir         = "/srv/remit-personas"
pending_dir = "/srv/remit-queue"        # enables uploads
# journal_path = "/srv/remit-queue/journal.jsonl"   # default
```

`pending_dir` must not be inside `dir`. The broker refuses to start if it is,
because a queue that gets scanned is not a queue — the uploads it holds would be
served to everyone, which is the failure the queue exists to prevent.

### Nothing publishes itself

An upload lands in the queue and is invisible: absent from the listing, and
`404` if fetched by slug. `POST /v1/personas/gallery` answers **202 Accepted**
with `"status": "pending"`, never "created" — an uploader told "published" will
go and tell their team to install something nobody can see.

A person promotes it, from a shell on the broker:

```
remit-cloud gallery --config remit-cloud.toml list
remit-cloud gallery --config remit-cloud.toml show <id>
remit-cloud gallery --config remit-cloud.toml approve <id>
remit-cloud gallery --config remit-cloud.toml reject <id> [why]
remit-cloud gallery --config remit-cloud.toml journal
remit-cloud gallery --config remit-cloud.toml verify
```

`--config` may go before or after the subcommand. Without it the console reads
the built-in defaults, where uploads are disabled, and will tell you so.

#### Reviewing one

`list` is the queue: who uploaded what, when, and the skills each bundle
carries.

```
$ remit-cloud gallery --config remit-cloud.toml list
notes-to-confluence      from ada@example.com      2026-09-01T02:06:43Z
    skills: triage.md
    read it: remit-cloud gallery --config remit-cloud.toml show notes-to-confluence

1 waiting. approve with:  remit-cloud gallery --config remit-cloud.toml approve <id>
```

`show` prints the thing itself — the manifest, then every skill:

```
$ remit-cloud gallery --config remit-cloud.toml show notes-to-confluence
notes-to-confluence
  uploaded by  ada@example.com
  uploaded at  2026-09-01T02:06:43Z
  archive      sha256:db1dc1e6…
  on disk      queue/notes-to-confluence

─── manifest.md ───
---
id: notes-to-confluence
…
─── skills/triage.md ───
…
```

**Read the skills.** They are behaviour, not description: they run on the
machine of everyone who installs this coworker. The manifest tells you what it
claims to do; the skills are what it will actually do. Files over 16 KiB are
truncated on screen and the on-disk path is printed so you can open them
properly — the pending bundle is ordinary files in `pending_dir`, so `less`,
`diff` and your editor all work on it.

#### Deciding

```
remit-cloud gallery --config remit-cloud.toml approve notes-to-confluence
kill -HUP $(pgrep -f remit-cloud)
```

Approve moves the bundle into the served directory. The running broker keeps its
old scan until it is reloaded, so the `HUP` is what makes it appear — the same
step as adding a manifest by hand. `reject` deletes the pending copy and frees
the id; the reason you give is recorded.

Both outcomes are journalled either way, so a rejection is as traceable as an
approval.

#### Reviewing without a shell

The console needs shell access on the broker. If the person who curates the
gallery is not the person who administers the box, name them as an operator:

```toml
[auth]
mode                 = "none"
require_verification = true          # required for this — see auth.md
operators            = ["curator@corp.example"]
```

They then get a **Review queue** in Remit itself, under Settings ▸ Coworkers —
the queue, each upload's manifest and skills in full, and Approve/Reject. Nobody
else sees the section: the app asks this broker whether they may review, and
takes the answer.

The same queue is reachable directly, for a script or a different client:

| Method | Path | What |
|---|---|---|
| `GET`  | `/v1/admin/whoami` | am I an operator here? (any signed-in session) |
| `GET`  | `/v1/admin/uploads` | the queue |
| `GET`  | `/v1/admin/uploads/{slug}` | the manifest and every skill, in full |
| `POST` | `/v1/admin/uploads/{slug}/approve` | publish it |
| `POST` | `/v1/admin/uploads/{slug}/reject` | discard it |
| `GET`  | `/v1/admin/journal` | the record, and whether its chain still verifies |

Approving over HTTP also **reloads the gallery**, which the console cannot do —
it runs in a different process and has to ask you for a `SIGHUP`.

**An operator is a session whose identity this broker actually established**, not
one that claims the right address. In `none` mode that means verified by code;
in `oidc` it means asserted by your IdP. Listing operators on a `none`-mode
broker without `require_verification` is refused at startup, because anyone can
type an address, and an allowlist over a self-asserted email looks like a control
while granting nothing.

Everything under `/v1/admin` answers **404** to anyone else — not 403. Someone
with no part in administering this gallery has nothing to act on either way, and
"forbidden" would tell them the queue is there.

#### Why the console still exists

Shell access works when nothing else does — before an operator is configured,
when sign-in is broken, when you are already on the box fixing something else.
It is also the only way in until somebody configures the operator tier, since
that tier needs a verified identity to mean anything.

Use whichever fits. The console and the HTTP queue are the same queue, the same
journal, and the same refusals.

### Versions are the gallery's, not the author's

A coworker this broker publishes gets **v1 at its first approval, v2 at the next,
and so on**. Whatever the author wrote in `version:` stays in their manifest,
untouched — only the card carries the gallery's number.

That is not tidiness. Author-set versions cannot reliably be ordered against each
other: `"2"` against `"1.2.0"`, `"10"` against `"9"`, `"2026-08-01"` against
anything. An installer asking "is there a newer one?" could only be told "it
differs", which is true and nearly useless. Integers assigned in order make the
answer exact.

Consequences worth knowing:

- **A rejection does not advance the number.** Nothing was published.
- **A delete does not reset it.** Somebody may still have v3 installed, and
  reusing the number for different content would leave their copy looking
  current forever.
- **Coworkers you copied onto disk keep their own version.** The broker only
  numbers what it published, so a hand-placed manifest is served as written.

The number is DERIVED from the journal — it is the count of approvals — rather
than stored anywhere. It cannot drift from the record, needs no migration, and
is exactly as tamper-evident as the chain it comes from.

### Who owns what

The uploader is the session's identity — never anything in the request. A
manifest may carry `publisher:`, and it decides nothing: replacing or deleting a
coworker requires the email that published it. A different person uploading an
existing id gets a conflict, not an overwrite. Re-uploading your own returns it
to the queue rather than straight back into everyone's gallery.

Publishing needs an identity that names a **person**. In mode `none` a session
that never said who it was still carries the deployment-wide label from
`[auth.none]`, and that is not a person — every anonymous uploader would share
one owner, so any of them could replace any other's coworker. Such a session is
refused with `403 identity_required`.

Limits: 8 MiB per archive, 200 files, 20 coworkers per uploader. A bundle
carries `manifest.md` and `skills/` and nothing else; anything else is refused,
as are absolute paths, `..` segments and Windows separators.

### Install counts, and only counts

Each card carries how many times its coworker has been installed from here, so
an operator can tell which of them anyone actually uses — the question that says
what is worth maintaining.

**A number per coworker and nothing else.** The install event the client sends
carries a subject and a platform, and keeping them would have been one line. That
line is deliberately not written: "which of these does anyone use" is a question
about coworkers, "who uses this" is a question about people, and a company-wide
record of what individuals chose to run is not something a gallery should hold
merely because the data passed through it. The subject appears in this broker's
log, which is yours, and goes no further.

Counts land in `<pending_dir>/installs.json`, or wherever you point
`install_counts_path` — a gallery that accepts no uploads needs that set
explicitly, and without a path the counts live in memory and reset on restart
(startup says so).

Only a slug this gallery actually serves is counted, so a typo or a probe cannot
invent entries.

The count is read when a card is SERVED, not when the gallery was last scanned —
counts change on every install and a rescan happens on `SIGHUP`, which for most
deployments is never. It counts **installs, not people**: an update goes through
the same path, so somebody updating twice counts twice. Distinguishing them would
mean keeping track of who, which is the thing this deliberately does not do.

### The journal

Every change is appended to a hash-chained JSONL file — uploads, approvals,
rejections, deletions, **and refusals**. A record that only holds successes
cannot answer "did somebody try", which is usually the more interesting
question.

Each entry carries the hash of the one before it, so an edit or a deletion
anywhere breaks verification from that point on. That does not make tampering
impossible — anyone who can write the file can rewrite the chain — it makes it
**detectable**. The broker verifies the chain at startup and **refuses to run**
if it does not hold: serving a gallery whose provenance record is broken would
assert history it cannot support.

Ownership is derived from this record rather than stored beside the files, so
"who owns this coworker" is answered by something that cannot be quietly edited.

## The coworkers in `personas/`

`appsec-reviewer`, `incident-scribe`, `onboarding-guide`, `wiz-security-analyst`,
`data-analyst` and `design-reviewer` are **samples**, so that a fresh broker has
something to serve and a bundle to copy. Each names only connectors and MCP
servers the runtime can actually connect; a test holds them to that.

They are also real gallery entries. A deployment that leaves `gallery.dir`
pointed at `./personas` publishes all six to the whole company, under
publishers nobody there chose ("Platform Security", "Developer Experience",
"Data Platform", "Product Design"), and they sit alongside real work in
everyone's gallery.

For anything beyond a trial, point `dir` somewhere of your own:

```toml
[gallery]
dir         = "/srv/remit-personas"
pending_dir = "/srv/remit-queue"
publisher   = "Acme"                 # the label on cards whose manifest declares none
```

Copy the samples across if you want them, or delete them. `publisher` is worth
setting: without it, uploaded coworkers are labelled `Internal`.

