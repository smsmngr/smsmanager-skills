# SmsManager Skills

AI agent skills for the SmsManager messaging API. Get expert guidance on sending SMS, Viber and
WhatsApp messages, handling delivery reports, and processing inbound replies — right inside your AI
coding agent.

These skills teach your agent how to use the **SmsManager JSON API v2** correctly: the omnichannel
`flow` model, sender IDs, Unicode vs GSM encoding, scheduling, batch sends, and delivery/reply
webhooks — including the gotchas an LLM otherwise gets wrong.

## Install

```bash
npx skills add smsmanager/skills
```

That's it — no credentials needed to install. Your agent now has expert knowledge of the SmsManager
API. You only need an API key when you want to send a real message.

## Skills

| Skill | Category | What it does |
|-------|----------|--------------|
| [smsmanager-authentication](skills/smsmanager-authentication/SKILL.md) | Core | API key handling, base URL, `x-api-key` header vs `apikey` query, 401/403 troubleshooting. |
| [smsmanager-messaging-api](skills/smsmanager-messaging-api/SKILL.md) | Messaging | Send SMS, Viber and WhatsApp via `/message`, `/messages` and `/simple/message` — omnichannel `flow`, sender IDs, Unicode, scheduling, batch, tags, custom payloads. |
| [smsmanager-delivery-reports](skills/smsmanager-delivery-reports/SKILL.md) | Messaging | Delivery-status, inbound-message and inbound-reply webhooks (`callback` URL), status codes, two-way SMS. |

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

- **Base URL:** `https://api.smsmngr.com/v2`
- **Auth:** `x-api-key: YOUR_API_KEY` header (recommended), or `apikey` query parameter for the
  simple GET endpoint. Get your key at [app.smsmanager.com/api-cloud](https://app.smsmanager.com/api-cloud).
- **Credentials** come from environment variables (`SMSMANAGER_API_KEY`), never hardcoded.
- **Phone numbers:** international E.164 format without a leading `+` or `00` (e.g. `420777123456`).

## Contributing

See [CLAUDE.md](CLAUDE.md) for the full authoring guide and [AGENTS.md](AGENTS.md) for a quick
reference. All API facts must match the
[OpenAPI spec](https://api-ref.smsmanager.com/_bundle/openapi/cs/json/jsonapi_v2.json).

## Use of SmsManager services

Using these skills to call the SmsManager API requires a valid SmsManager account and acceptance of
the SmsManager Terms of Service. The skills are provided on an "as-is" basis under the Apache-2.0
license. SmsManager is not responsible for the third-party AI tools you use them with.

## License

[Apache-2.0](LICENSE)
