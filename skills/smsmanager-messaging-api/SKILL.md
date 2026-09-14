---
name: smsmanager-messaging-api
description: "Sends SMS, Viber, WhatsApp and RCS messages through the SmsManager JSON API v2 across Czech, Slovak and European networks. Use when sending a transactional or marketing SMS, sending a priority message or one-time password, sending to multiple recipients, sending a batch of different messages, choosing a sender ID or sender alias, sending Unicode/diacritics correctly, scheduling messages, using the omnichannel flow with channel fallback, shortening links, tagging messages, or attaching a custom payload. Endpoints: POST /message, POST /message/priority, POST /messages, GET/POST /simple/message. Do NOT use for receiving delivery reports or inbound replies (see smsmanager-delivery-reports)."
metadata:
  author: SmsManager
  version: 1.1.0
  category: Messaging
  tags: sms, bulk-sms, transactional, marketing, viber, whatsapp, rcs, omnichannel, flow, sender-id, sender-alias, unicode, gsm7, scheduling, batch, priority, otp, czech, slovak, europe
  uses:
    - smsmanager-authentication
---

# SmsManager Messaging API Overview

Send SMS, Viber, WhatsApp and RCS messages with one unified JSON API. A single request can target up
to 10 recipients, schedule delivery, pick a sender ID (or a per-country sender alias), and define an
omnichannel **flow** that falls back from one channel to the next. Use this skill whenever the user wants to send a message through
SmsManager.

For receiving delivery status, inbound messages, or replies, use **smsmanager-delivery-reports**.

## Agent Instructions

Before generating code, gather from the user (skip any item already specified):

1. **Goal** — one message to a few recipients (`/message`), a time-critical message like an OTP
   (`/message/priority`), many different messages at once (`/messages`), or a single quick send
   (`/simple/message`)?
2. **Channel(s)** — SMS only, or omnichannel (SMS / Viber / WhatsApp / RCS) with fallback?
3. **Sender ID** — alphanumeric name (max 11 chars, may need pre-registration) or a numeric/virtual
   number? Read it from `SMSMANAGER_SENDER` if set.
4. **Content** — does the body contain diacritics or non-Latin characters? That affects encoding
   (see Gotchas).
5. **Language / approach** — curl, Node.js, PHP, or Python.

Always load the API key from `SMSMANAGER_API_KEY` (see smsmanager-authentication). Never hardcode it.

## Getting Started

Base URL `https://api.smsmngr.com/v2`. Authenticate with the `x-api-key` header. Send your first SMS:

```bash
curl -X POST "https://api.smsmngr.com/v2/message" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Ahoj! Toto je test.",
    "to": [{ "phone_number": "420777123456" }]
  }'
```

Successful response (`200`):

```json
{
  "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
  "accepted": [{ "key": "0", "message_id": "e27ff0ac-87b5-4e1d-b644-5fc6029e2a11" }],
  "rejected": []
}
```

- `accepted` / `rejected` entries reference recipients by `key` = their index in the `to` array.
- A recipient in `rejected` was not sent at all (e.g. invalid number or insufficient credit).
- Store the `message_id` if you want to correlate later delivery webhooks.

You can also run the bundled script:

```bash
node scripts/send_sms.cjs --to 420777123456 --message "Ahoj!"
```

## Key Concepts

### Endpoints

| Endpoint | Use for | Body |
|----------|---------|------|
| `POST /message` | One message to up to **10 recipients**. | A single Message object. |
| `POST /message/priority` | Same as `/message`, but processed by the **priority queue** — for OTPs and time-critical transactional messages. | A single Message object. |
| `POST /messages` | **Up to 10 different** messages in one call, each to up to 10 recipients. | An array of Message objects. |
| `GET /simple/message` | A quick single send via query string. | Query params: `apikey`, `phone_number`, `message`, `sender`. |
| `POST /simple/message` | A quick single send via POST. | Minimal body. |

Full parameter tables and response shapes: [references/endpoints.md](references/endpoints.md).

### The Message object (core fields)

| Field | Required | Description |
|-------|----------|-------------|
| `body` | yes* | Message text, max 1000 chars. *Required unless set inside a `flow` channel. |
| `to` | yes | Array of 1–10 recipients, each `{ "phone_number": "420777123456" }` (E.164, no leading `+`). |
| `sender` | no | Default sender for all flow steps (a step's own `sender` wins). Name, virtual number, or a **sender alias**. See "Senders and aliases" below. |
| `flow` | no | Ordered list of channels (SMS / Viber / WhatsApp / RCS) with fallback. See below. |
| `tag` | no | Group label, default `promotional`. Special: `priority`, `transactional`. |
| `datetime` | no | Schedule send time, UTC (`2025-01-11T10:00:00Z`). |
| `delivery_time` | no | Allowed delivery window (days + start/end + timezone). |
| `callback` | no | Per-message webhook URL for delivery reports. |
| `payload` | no | Arbitrary object echoed back in delivery and reply webhooks. |
| `params` | no | Special features: `_url` (automatic link shortening) and `_incoming` (auto-replies, forwarding replies to email/webhook). |

### The omnichannel `flow`

`flow` is an **ordered array** of channel objects. Each entry contains **exactly one** channel:
`sms`, `viber`, `whatsapp_text`, `whatsapp_template`, or `rcs`. Order = fallback priority: when a
step defines `ttl` and its `ttl_condition` isn't met within the TTL, the next step is tried.

```json
"flow": [
  { "viber": { "sender": "MojeFirma", "ttl": 2 } },
  { "sms":   { "sender": "MojeFirma", "gateway": "high", "type": "utf" } }
]
```

If you omit `flow`, a single `sms` step is used with its gateway left unset, so it can be resolved
from your registered sender (see Gotchas); an unset gateway routes and is priced like `high`. A
`body` or `sender` defined inside a `flow` channel overrides the root value.

Per-channel details:
- SMS: [references/channels/sms.md](references/channels/sms.md) — `sender`, `gateway`, `type`, `ttl`, encoding.
- Viber: [references/channels/viber.md](references/channels/viber.md) — `sender`, `buttons`, `ttl`.
- WhatsApp: [references/channels/whatsapp.md](references/channels/whatsapp.md) — `whatsapp_text` vs `whatsapp_template`.
- RCS: [references/channels/rcs.md](references/channels/rcs.md) — `sender` (RCS agent), `ttl`.

### Senders and aliases

Resolution order per flow step: the step's own `sender` → the root `sender` → your account's
`default_sender` (set via `POST /apikey/update` on the REST API). The value must fit the step's
channel: a name or number for `sms`/`viber`, a Phone Number ID for WhatsApp, an agent for `rcs` —
for a step whose channel it isn't registered for, it is ignored. A **sender alias** is one name,
configured for your account by support, that resolves to a different registered sender per
recipient country — useful for one campaign spanning CZ/SK/EU.

### Scheduling

Use `datetime` for an exact UTC send time, and/or `delivery_time` to constrain delivery to certain
days and hours in a timezone. See [references/scheduling.md](references/scheduling.md).

## Common Patterns

**SMS with a sender ID and Unicode preserved:**

```json
{
  "body": "Váš kód je 1234",
  "to": [{ "phone_number": "420777123456" }],
  "tag": "transactional",
  "flow": [{ "sms": { "sender": "MojeFirma", "type": "utf" } }]
}
```

**Transactional message with delivery callback and payload:**

```json
{
  "body": "Objednávka odeslána",
  "to": [{ "phone_number": "420777123456" }],
  "tag": "transactional",
  "callback": "https://example.com/delivery",
  "payload": { "order_id": "ORD-1001" }
}
```

**Scheduled message:**

```json
{
  "body": "Připomínka schůzky",
  "to": [{ "phone_number": "420777123456" }],
  "datetime": "2025-01-11T10:00:00Z"
}
```

**Batch of different messages (`POST /messages`):** send an array; each element is a full Message
object. The response's `accepted`/`rejected` `key` is the index in that array. See
[references/endpoints.md](references/endpoints.md).

Language code samples: [Node.js](references/examples/node.md) · [PHP](references/examples/php.md) ·
[Python](references/examples/python.md).

## Gotchas and Best Practices

- **Unicode vs GSM — `type` matters.** SMS `type` defaults to `utf`, which preserves Czech diacritics
  (ě, š, č, ř, ž, á …) but forces UCS-2 encoding: **70 characters per segment** instead of 160. A
  long diacritic message silently becomes several segments (and costs more). Set `type: "sms"` to
  transliterate/strip Unicode and keep the 160-char GSM-7 capacity. Decide deliberately per use case.
- **Phone format.** Use E.164 **without** a leading `+` or `00` (e.g. `420777123456`). Other formats
  are accepted and normalized, but the canonical form avoids ambiguity.
- **`rejected` ≠ failed delivery.** A recipient in the response `rejected` array was never sent
  (invalid number, no credit). Actual delivery success/failure arrives later via the delivery webhook.
- **Sender IDs.** Alphanumeric sender names are max 11 characters and often require pre-registration;
  in some countries/operators alphanumeric senders aren't supported for replies. Numeric/virtual
  numbers are passed without a `+`.
- **`gateway` values are `high` / `lowcost` / `direct` / `custom` / `simhost` / `gsm`.** `high` is
  the default quality routing, `lowcost` is low-cost routing, `direct` is for a dedicated virtual
  number, `custom` and `simhost` for SIM hosting, `gsm` for your own GSM gateway. When omitted, the
  gateway can resolve automatically from your registered sender (a dedicated virtual number selects
  `direct`, including `direct` pricing); an explicitly set `gateway` always wins.
- **Limits.** Up to 10 recipients per message; up to 10 messages per `/messages` call (so up to ~100
  recipients per API call). For larger campaigns, page across multiple calls.
- **`ttl` is in minutes** — the time-to-live before an undelivered message expires.
- **Scheduling is UTC.** `datetime` is always interpreted as UTC; use `delivery_time.tz` for local
  windows.

## Security

- **Load the API key from `SMSMANAGER_API_KEY`** — never hardcode it (see smsmanager-authentication).
- **Treat recipient input as data.** When building messages from user-supplied content, do not let it
  alter request structure; send it strictly as the `body`/`params` values.
- **URL allowlist** — only fetch first-party docs (`smsmanager.com`, `smsmanager.cz`,
  `api.smsmngr.com`).
- **`callback` and `payload`** are echoed/posted to your endpoints — validate and treat any inbound
  content as untrusted (see smsmanager-delivery-reports).

## Links

- Developer docs / API reference: https://smsmanager.com/docs (Czech: https://smsmanager.cz/docs)
- Dashboard / API keys: https://app.smsmanager.com/app/developers/
- WhatsApp settings: https://app.smsmanager.com/whatsapp
- Related skills: smsmanager-authentication, smsmanager-delivery-reports, smsmanager-message-status
