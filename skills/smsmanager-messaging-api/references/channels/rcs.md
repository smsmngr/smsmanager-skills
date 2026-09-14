← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# RCS channel

The `rcs` channel sends an RCS Business message inside a `flow` entry. Like Viber, it is typically
combined with an `sms` fallback so recipients without RCS support still get the message.

## Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `body` | string (≤1000) | yes | Overrides the root `body` for this channel. |
| `sender` | string | yes* | The RCS **agent** you pre-registered for your account, or a sender alias. *May also be supplied via the root `sender`; falls back to the account `default_sender`. |
| `ttl` | number (≥0.5) | no | Time-to-live in **minutes**. |
| `ttl_condition` | enum | no | `sent`, `delivered` (default), `seen` — condition checked when the TTL expires before moving to the next flow step. |

## Example

RCS with SMS fallback:

```json
{
  "to": [{ "phone_number": "420777123456" }],
  "flow": [
    {
      "rcs": {
        "body": "Your order is ready for pickup",
        "sender": "MyRcsAgent",
        "ttl": 10,
        "ttl_condition": "delivered"
      }
    },
    { "sms": { "body": "Your order is ready for pickup", "sender": "MojeFirma" } }
  ]
}
```

## Gotchas

- `sender` must be a **pre-registered RCS agent** — contact SmsManager to set one up.
- In delivery webhooks the `gateway` field reports `rcs` (see smsmanager-delivery-reports).
- `ttl` is minutes, not seconds; `ttl_condition` defaults to `delivered` for RCS (unlike SMS, where
  it defaults to `sent`).
