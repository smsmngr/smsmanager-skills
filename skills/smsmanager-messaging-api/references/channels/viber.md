← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# Viber channel

The `viber` channel sends a Viber Business message inside a `flow` entry. It is typically combined
with an `sms` fallback so recipients without Viber still get the message.

## Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `body` | string (≤1000) | yes | Overrides the root `body` for this channel. |
| `sender` | string | yes | The sender name you pre-registered for Viber Business messaging. |
| `buttons` | array (max 1) | no | A single call-to-action button: `{ "title": "…", "url": "https://…" }`. |
| `ttl` | integer | no | Time-to-live in **minutes**. |

## Examples

Viber with a button, falling back to SMS:

```json
{
  "body": "Sleva 20 % jen dnes!",
  "to": [{ "phone_number": "420777123456" }],
  "flow": [
    {
      "viber": {
        "sender": "MojeFirma",
        "ttl": 2,
        "buttons": [{ "title": "Koupit teď", "url": "https://example.com/sale" }]
      }
    },
    { "sms": { "sender": "MojeFirma" } }
  ]
}
```

Because `flow` is ordered, Viber is tried first; if the recipient has no Viber or doesn't accept it
within the TTL, the SMS entry is used.

## Gotchas

- `sender` must be a **pre-registered** Viber Business sender — arbitrary names are rejected.
- Only **one** button is supported, and it requires both `title` and `url`.
- Keep a short `ttl` when using Viber→SMS fallback so undelivered Viber messages roll over to SMS
  promptly.
