---
title: "Connectors: Slack"
description: "Connecting Slack asks for two tokens and nothing else. Everything else lives in Slack's own app settings, and Slack will not tell you what is missing —…"
---

<p class="rm-synced">Part of the Remit Coworker documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>

Connecting Slack asks for two tokens and nothing else. Everything else lives in
Slack's own app settings, and Slack will not tell you what is missing — a socket
with no event subscriptions connects happily and delivers nothing. This page is
the list the connect form cannot fit.

Two ways in:

- **Socket Mode** (this page) — your own Slack app, two tokens you paste in, one
  workspace, a direct WebSocket. No cloud account involved.
- **Managed relay** — "Add to Slack", no tokens, many workspaces, events pushed
  from Remit Cloud. Requires signing in to Remit Cloud.

## The shortest path that works

Fifteen minutes, five settings, three scopes. Do these in order — the order
matters only at the end, where installing is what makes the rest take effect.

1. **Create the app.** api.slack.com/apps → Create New App → From scratch. Pick
   the workspace.
2. **Socket Mode.** Settings → Socket Mode → toggle on. Generate an app-level
   token with `connections:write`. Copy it — it starts `xapp-`. This is the only
   place you will see it.
3. **Event Subscriptions.** Features → Event Subscriptions → Enable Events on.
   Under **Subscribe to bot events**, add `message.channels`. Leave the Request
   URL alone — Socket Mode does not use one.
4. **Scopes.** Features → OAuth & Permissions → Bot Token Scopes. Add
   `channels:history` and `chat:write`.
5. **Install.** OAuth & Permissions → Install to Workspace. Copy the **Bot User
   OAuth Token** — it starts `xoxb-`.

Then in Remit: **Connectors ▸ Slack**, paste both tokens, Connect. In Slack,
invite the bot to a channel with `/invite @YourApp`.

That gets you a coworker that can hear a public channel and reply in it. The
next section is what each addition buys.

## Scopes, and what each one is for

Nothing here is granted by default and nothing is implied by anything else. Add
only the rows you want.

| Want | Bot scope | Bot event |
|---|---|---|
| Hear a public channel | `channels:history` | `message.channels` |
| Reply | `chat:write` | — |
| Names instead of `U0…` / `C0…` IDs, and the people/channel pickers | `users:read`, `channels:read` | — |
| Private channels | `groups:history`, `groups:read` | `message.groups` |
| Direct messages | `im:history`, `im:read` | `message.im` |
| Group DMs | `mpim:history`, `mpim:read` | `message.mpim` |
| Send files | `files:write` | — |
| Approve/Deny buttons | — | Interactivity toggled on |

**The scope and the event are different things, and you need both.**
`channels:history` is permission to read a public channel;
`message.channels` is the subscription that causes Slack to send you anything.
Granting the scope without subscribing to the event is the failure that looks
like nothing at all: the WebSocket connects, the connector reads *Connected*,
and no message ever arrives.

You do **not** need `app_mentions:read`. Remit ignores `app_mention` events
entirely — a mention in a channel arrives as an ordinary `message.channels`
event and is detected from the text.

### After changing anything

Adding a scope or an event only takes effect once you **Reinstall to Workspace**
(OAuth & Permissions → Reinstall). If the `xoxb-` token changes, paste the new
one into Remit and restart the server so the socket reopens with it.

## Interactivity

Features → Interactivity & Shortcuts → toggle on. No Request URL is needed in
Socket Mode. Without it, Inbox approvals mirrored into Slack render as text with
dead buttons.

## Who is allowed to talk to it

The allow-list starts **empty and closed**. The first message from anyone new is
held, not delivered, and appears under **Connectors ▸ Slack ▸ Waiting** — allow
the sender there, or allow-and-deliver to release the original message without
asking them to repost.

**Approval owners** are a separate, narrower list: the people permitted to
resolve consequential Inbox prompts from inside Slack. Remit will not mirror an
approval into a channel that has no owner — nobody should be able to
rubber-stamp an action in a room where you never said who is trusted. This does
not affect channel monitoring; leave it empty until you route approvals to
Slack.

## Making a coworker listen

A subscription is a durable (session, channel) pair. Set one from the session's
right rail: **Access ▸ Sources ▸ Slack ▸ Channels**, then add the channel by
name, by pasting its Copy-link URL, or as a raw `slack:C0123` address. A bare
`#name` is rejected — Remit cannot resolve names locally, and storing one would
create a subscription that silently never matches.

Every subscription in one place: **Inbox ▸ Configure**, which also holds the DM
route and the Unrouted dead-letter list.

Subscribing changes how the coworker is addressed:

| | Mentioned | Not mentioned |
|---|---|---|
| **Subscribed** | must respond; in-thread replies pre-approved | judgement only, silence is the default |
| **Not subscribed** | a new session spawns and owns that thread | buffered for catch-up, nothing runs |

## When it does not work

| Symptom | Cause |
|---|---|
| Connector says Connected, nothing ever arrives | No bot event subscriptions. Add `message.channels` and reinstall. |
| `missing_scope` from a send | The bot token lacks `chat:write`. This is app-wide, not per-channel — Remit now names the exact scope Slack asked for. |
| `missing_scope` in the people or channel picker | `users:read` / `channels:read`. |
| `not_in_channel` | The bot is not in that channel. `/invite @YourApp`. |
| Senders and channels show as `U0…` / `C0…` | `users:read` / `channels:read` missing — everything works, it is only unreadable. |
| A message arrives but nothing runs | No session is subscribed, and it was not a mention. Check **Inbox ▸ Configure**. |
| Messages vanish and the sender is a real person | The allow-list. Check **Connectors ▸ Slack ▸ Waiting**. |
| A tagged message is treated as ordinary chatter | The bot user ID was not resolved at connect. The server logs it: `slack adapter connected (socket mode) bot_user_id=…` |

To confirm events are arriving at all, ask the server what it has seen — an
empty `recent` means nothing has reached Remit, which points at Slack, not at
your Remit configuration:

```bash
curl -s -H "X-Remit-Token: $(cat ~/.config/coworker/sidecar-8765.token)" http://127.0.0.1:8765/v1/connectors | python3 -c "import json,sys; s=[c for c in json.load(sys.stdin)['connectors'] if c['name']=='slack'][0]; print('recent:', s['recent']); print('waiting:', s['unauthorized'])"
```

## Replying without asking

A coworker tagged in a thread may reply into that thread without a card — until
the turn reads something else. Read a page to answer the question, and the reply
comes to you for approval, because a page can carry instructions and the reply
is where they would land. That is the outside-content floor
([security model](/docs/coworker/security/#outside-content)), and it is right for a channel
nobody has vouched for.

For a channel you have, name it: **Settings ▸ Connectors ▸ Slack ▸ Replies
without asking**, per workspace — or press **Reply in *channel* without asking**
on the card itself, which names it. Any coworker's send into that channel — a
mention answering in its thread, a listener posting to the channel, an
automation — is then a person-pinned target, read live from this list, so it
runs without a card and survives a page read; un-name it and the cards return.
You
are making the same trade an automation with a pinned standing rule makes: a page
can shape what is said in that channel, never where it goes. Take it for a
news-briefing channel; think twice for one where a reply moves money.

```bash
curl -s -X POST -H "X-Remit-Token: $(cat ~/.config/coworker/sidecar-8765.token)" -H "Content-Type: application/json" -d '{"team_id":"","channel_id":"C0BUDBAPLBW"}' http://127.0.0.1:8765/v1/connectors/slack/reply-channels/add
```
