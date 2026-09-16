# SmsManager Skills

AI agent skills for the SmsManager messaging API. Get expert guidance on sending SMS, Viber,
WhatsApp and RCS messages (including JSONL bulk campaigns), handling delivery reports, checking
message status, processing inbound replies, managing opt-out lists, and ordering senders and
numbers — right inside your AI coding agent.

These skills teach your agent how to use the **SmsManager APIs** correctly: the omnichannel `flow`
model, sender IDs and aliases, Unicode vs GSM encoding, scheduling, batch sends, delivery/reply
webhooks, and status polling — including the gotchas an LLM otherwise gets wrong.

## Install

**Claude Code** (as a plugin):

```
/plugin marketplace add smsmngr/smsmanager-skills
/plugin install smsmanager-skills@smsmanager
```

**Any agent supporting the skills CLI** (Claude Code, Cursor, Codex, ...):

```bash
npx skills add smsmngr/smsmanager-skills
```

**Manual:** copy the folders under `skills/` into your agent's skills directory (e.g.
`~/.claude/skills/`).

That's it — no credentials needed to install. Your agent now has expert knowledge of the SmsManager
API. You only need an API key when you want to send a real message.

## Skills

| Skill | Category | What it does |
|-------|----------|--------------|
| [smsmanager-authentication](skills/smsmanager-authentication/SKILL.md) | Core | API key handling, base URLs (JSON API v2 + REST API v1), `x-api-key` header vs `apikey` query, 401/403 troubleshooting. |
| [smsmanager-messaging-api](skills/smsmanager-messaging-api/SKILL.md) | Messaging | Send SMS, Viber, WhatsApp and RCS via `/message`, `/message/priority`, `/messages` and `/simple/message` — omnichannel `flow`, sender IDs and aliases, Unicode, scheduling, batch, tags, custom payloads. |
| [smsmanager-delivery-reports](skills/smsmanager-delivery-reports/SKILL.md) | Messaging | Delivery-status, inbound-message and inbound-reply webhooks (`callback` URL), status codes, rejection codes, two-way SMS. |
| [smsmanager-message-status](skills/smsmanager-message-status/SKILL.md) | Messaging | Poll message status, list sent messages, per-request/per-day statistics and the inbox via the REST API v1 (`/message`, `/messages`, `/request`, `/requests`, `/inbox`). |
| [smsmanager-optout-blacklist](skills/smsmanager-optout-blacklist/SKILL.md) | Messaging | Manage the opt-out list and blacklist — add/remove numbers, download the lists as CSV (`/optout`, `/blacklist`). |
| [smsmanager-services](skills/smsmanager-services/SKILL.md) | Account | Order paid services — alphanumeric senders, dedicated numbers, SIM hosting — with dry-run fee preview; check credit balance; cancel services (`/credit/services`, `/credit/order`, `/credit/cancel`). |
| [smsmanager-bulk-messaging](skills/smsmanager-bulk-messaging/SKILL.md) | Messaging | Mass-send from a JSONL file via presigned upload, validate messages without sending, cancel scheduled messages and bulk uploads (`/messaging/url`, `/messaging/validate`, `/messaging/cancel`). |

## Repository structure

```
skills/
└── smsmanager-<product>/
    ├── SKILL.md        # required — the entry point (under 500 lines)
    ├── references/     # optional — detailed docs loaded on demand
    ├── scripts/        # optional — runnable zero-dependency Node .cjs helpers
    └── assets/         # optional — sample files
```

Each `SKILL.md` is short and links to `references/` for depth (progressive disclosure), so the agent
loads only what it needs.

## Conventions

- **Base URLs:** `https://api.smsmngr.com/v2` (JSON API v2, sending) and
  `https://rest-api.smsmngr.com/v1` (REST API v1, status/inbox).
- **Auth:** `x-api-key: YOUR_API_KEY` header (recommended), or `apikey` query parameter for the
  simple GET endpoint. Get your key at
  [app.smsmanager.com/app/developers/](https://app.smsmanager.com/app/developers/).
- **Credentials** come from environment variables (`SMSMANAGER_API_KEY`, optional
  `SMSMANAGER_BASE_URL`, `SMSMANAGER_REST_BASE_URL`, `SMSMANAGER_SENDER`), never hardcoded.
- **Phone numbers:** international E.164 format without a leading `+` or `00` (e.g. `420777123456`).

## Hosted MCP server

These skills are the **knowledge layer**. For the **action layer** — an AI assistant operating a
real SmsManager account (send messages, check delivery, manage keys, credit and senders) — connect
the hosted MCP server at `https://app-api.smsmanager.com/functions/v1/mcp` (OAuth sign-in, no API
keys to configure). Documentation: [smsmngr/smsmanager-mcp](https://github.com/smsmngr/smsmanager-mcp).
Cursor users get both layers at once via
[smsmngr/smsmanager-cursor-plugin](https://github.com/smsmngr/smsmanager-cursor-plugin).

## Contributing

See [CLAUDE.md](CLAUDE.md) for the full authoring guide and [AGENTS.md](AGENTS.md) for a quick
reference. All API facts must match the official API reference at
[smsmanager.com/docs](https://smsmanager.com/docs).

## Use of SmsManager services

Using these skills to call the SmsManager API requires a valid SmsManager account and acceptance of
the SmsManager Terms of Service. The skills are provided on an "as-is" basis under the Apache-2.0
license. SmsManager is not responsible for the third-party AI tools you use them with.

## License

[Apache-2.0](LICENSE)
