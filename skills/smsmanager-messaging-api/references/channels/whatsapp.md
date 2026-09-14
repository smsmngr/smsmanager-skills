← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# WhatsApp channels

There are two WhatsApp channel types for the `flow`:

- `whatsapp_template` — a **pre-approved template** message. Required to initiate a conversation.
- `whatsapp_text` — a free-form text message. Only allowed **after** the recipient has replied to a
  template or messaged you first (the 24-hour customer-service window).

Both require a registered WhatsApp number. The `sender` is the **phone number ID** of your registered
WhatsApp number, found in [WhatsApp settings](https://app.smsmanager.com/whatsapp).

## whatsapp_template

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `template_name` | string (≤100) | yes | Name of a template you pre-registered and got approved. |
| `sender` | string | yes | WhatsApp phone-number ID (e.g. `514578330250514`). |
| `language` | string | yes | Template language code, e.g. `en`, `cs`. A template can have several languages. |
| `params` | string[] | no | Values for the body parameters, in order. |
| `params_header` | string[] | no | Value(s) for a header parameter. |
| `params_buttons` | string[] | no | Values for parameterized buttons. |
| `ttl` | integer | no | Time-to-live in minutes. |

```json
{
  "to": [{ "phone_number": "420777123456" }],
  "flow": [
    {
      "whatsapp_template": {
        "template_name": "order_update",
        "sender": "514578330250514",
        "language": "cs",
        "params": ["ORD-1001", "12. 1. 2025"]
      }
    },
    { "sms": { "sender": "MojeFirma" } }
  ]
}
```

## whatsapp_text

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `body` | string (≤1000) | yes | Free-form text. Allowed only inside an open customer-service window. |
| `sender` | string | yes | WhatsApp phone-number ID. |

```json
{
  "body": "Děkujeme za zprávu, vyřizujeme to.",
  "to": [{ "phone_number": "420777123456" }],
  "flow": [{ "whatsapp_text": { "sender": "514578330250514" } }]
}
```

## Gotchas

- You **cannot** start a conversation with `whatsapp_text` — use `whatsapp_template` first. Free-form
  text only works after the recipient has engaged.
- `template_name` + `language` must match an approved template exactly; mismatches are rejected.
- The number of `params` must match the template's placeholders.
- In **delivery and inbound webhooks**, both WhatsApp types are reported simply as `whatsapp`
  (inbound messages are not split into `whatsapp_text` / `whatsapp_template`). See
  smsmanager-delivery-reports.
- Combine with an `sms` fallback in the `flow` for recipients who aren't on WhatsApp.
