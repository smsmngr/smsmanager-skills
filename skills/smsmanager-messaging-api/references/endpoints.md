← [Back to smsmanager-messaging-api SKILL.md](../SKILL.md)

# Endpoints reference

Base URL: `https://api.smsmngr.com/v2`. Auth: `x-api-key` header (or `apikey` query for the simple
GET). All examples assume `SMSMANAGER_API_KEY` is set.

---

## POST /message — send one message

Send a single message to up to 10 recipients.

### Request body — the Message object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `body` | string (≤1000) | yes* | Message text. *Optional only if a body is set inside a `flow` channel. |
| `to` | array (1–10) | yes | Each item: `{ "phone_number": "420777123456" }`. E.164 without leading `+`/`00`. |
| `sender` | string | no | Default sender for all flow steps (a step's own `sender` wins; account `default_sender` is the last fallback). Name, virtual number, or sender alias. |
| `flow` | array | no | Ordered channel list with fallback; each item has exactly one of `sms`, `viber`, `whatsapp_text`, `whatsapp_template`, `rcs`. See channel references. |
| `tag` | string | no | Default `promotional`. Special values: `priority`, `transactional`. |
| `datetime` | string (date-time) | no | Scheduled send time in **UTC**, e.g. `2025-01-11T10:00:00Z`. |
| `delivery_time` | object | no | Delivery window: `days[]`, `start`, `end`, `tz`. See scheduling reference. |
| `callback` | string (uri) | no | Per-message webhook URL for delivery notifications. |
| `payload` | object | no | Arbitrary data echoed back in delivery and reply webhooks. |
| `params` | object | no | Special features: `_url` (automatic link shortening — `type`, `domain`, `get_enhance: "id"` to append the `message_id` to the short link, `expires_at`) and `_incoming` (incoming-reply handling — forward replies to `email_to`, POST them to `callback`, or send keyword-matched automatic replies via `reply`). |

### Example

```bash
curl -X POST "https://api.smsmngr.com/v2/message" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Test message",
    "to": [{ "phone_number": "420777123456" }],
    "flow": [{ "sms": { "sender": "SmsManager", "gateway": "high", "ttl": 10 } }]
  }'
```

### Response — MessageResponse (`200`)

```json
{
  "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
  "accepted": [{ "key": "0", "message_id": "e27ff0ac-87b5-4e1d-b644-5fc6029e2a11" }],
  "rejected": []
}
```

- `request_id` — unique identifier for the whole request.
- `accepted[]` — `key` is the recipient's index in `to`; `message_id` identifies the accepted message.
- `rejected[]` — `key` is the recipient's index in `to`. Rejected = not sent (invalid number / no
  credit). This is **not** a delivery failure — delivery outcome arrives via webhook.
- `400` Bad Request — malformed body or invalid fields.

---

## POST /message/priority — send a priority message

Same request and response format as `/message`, but the message is processed by the **priority
queue**. Use it for time-critical messages: one-time passwords, transactional notifications.

```bash
curl -X POST "https://api.smsmngr.com/v2/message/priority" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Your verification code is 123456",
    "to": [{ "phone_number": "420777123456" }],
    "tag": "transactional"
  }'
```

---

## POST /messages — send multiple messages (batch)

Send up to **10 different** Message objects in one call, each to up to 10 recipients (so up to ~100
recipients per API call). The body is an **array** of Message objects (same schema as above).

### Example

```bash
curl -X POST "https://api.smsmngr.com/v2/messages" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    { "body": "Hello John", "to": [{ "phone_number": "420777123456" }] },
    { "body": "Hello Jane", "to": [{ "phone_number": "420777654321" }] }
  ]'
```

### Response — MessagesResponse (`200`)

```json
{
  "request_id": "…",
  "accepted": [{ "key": "0", "message_id": "…" }, { "key": "1", "message_id": "…" }],
  "rejected": []
}
```

Here `key` is the index of the request **in the body array** (not the recipient index). In delivery
webhooks, a `/messages` send appends `-<recipient_index>` to each `message_id`.

---

## GET /simple/message — quick send via query string

All parameters go in the URL. Useful for very simple integrations and testing.

| Query param | Required | Notes |
|-------------|----------|-------|
| `apikey` | yes | API key (query auth, since there are no headers in a plain link). |
| `phone_number` | yes | Recipient, E.164 without leading `+` (alias `number` also accepted). |
| `message` | yes | Message text, URL-encoded (alias `body` also accepted). |
| `sender` | yes | Sender ID. |
| `gateway` | no | `high` (default), `lowcost`, `direct`, `custom`, `simhost`, `gsm`. |
| `datetime` | no | Scheduled send time in UTC (alias `time` also accepted). |
| `customID` | no | Your own message identifier — stored in the message `payload` (as `customID`) and returned in delivery notifications. |

```bash
curl -G "https://api.smsmngr.com/v2/simple/message" \
  --data-urlencode "apikey=$SMSMANAGER_API_KEY" \
  --data-urlencode "phone_number=420777123456" \
  --data-urlencode "message=Ahoj!" \
  --data-urlencode "sender=MojeFirma"
```

> Prefer the header-authenticated `POST /message` for production. Query-string API keys can leak into
> logs and browser history.

## POST /simple/message — quick send via POST

Same intent as the GET form but as a POST with `application/x-www-form-urlencoded` body (same
fields, minus `apikey`). Authenticate with the `x-api-key` header.

### Response — MessageSimpleResponse (`200`)

```json
{
  "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
  "message_id": "bc36f3d1-d284-463a-921b-a3560c154649",
  "accepted": true
}
```

`accepted` is a boolean: `true` if the message was accepted, `false` if rejected.

## Links

- Developer docs / API reference: https://smsmanager.com/docs
- Channels: [sms.md](channels/sms.md) · [viber.md](channels/viber.md) · [whatsapp.md](channels/whatsapp.md) · [rcs.md](channels/rcs.md)
- Scheduling: [scheduling.md](scheduling.md)
