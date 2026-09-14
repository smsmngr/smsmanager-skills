← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# SMS channel

The `sms` channel is used inside a `flow` entry, or implicitly when you send without a `flow`.

## Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `body` | string (≤1000) | yes (in flow) | — | Overrides the root `body` for this channel. |
| `sender` | string | no | account default | Alphanumeric name (max 11 chars, may need pre-registration) or a reserved virtual number (without `+`). |
| `gateway` | enum | no | `high` | `high`, `direct`, or `custom`. See below. |
| `ttl` | integer | no | — | Time-to-live in **minutes** before an undelivered message expires. |
| `type` | enum | no | `utf` | `utf` keeps Unicode; `sms` converts/removes Unicode to maximize capacity. See encoding. |

## `gateway` values

| Value | Use when |
|-------|----------|
| `high` | Default. Standard high-quality routing. |
| `direct` | You are sending from a dedicated **virtual number**. |
| `custom` | You are using **SIM hosting**. |

`gateway` selects the routing/sending method — it is not a price tier.

## Encoding: `type` = `utf` vs `sms`

This is the most important SMS gotcha.

| `type` | Encoding | Chars per segment | Effect |
|--------|----------|-------------------|--------|
| `utf` (default) | UCS-2 (Unicode) | **70** (then 67 per part when concatenated) | Preserves Czech diacritics (ě š č ř ž á í é ú …) and any non-Latin script. |
| `sms` | GSM-7 | **160** (then 153 per part) | Transliterates/strips Unicode (diacritics removed) to keep maximum capacity and lower cost. |

Implications:
- A message with diacritics under `type: utf` uses UCS-2, so it fits only 70 characters before
  splitting into multiple billable segments. A 160-character Czech sentence can become 3 segments.
- If diacritics aren't essential (e.g. "Vas kod je 1234"), `type: "sms"` keeps it to one 160-char
  GSM-7 segment.
- Choose deliberately per use case: brand/marketing copy often wants diacritics (`utf`); high-volume
  transactional alerts often prefer `sms` for cost.

## Examples

SMS only, Unicode preserved, with a sender ID:

```json
{
  "body": "Váš ověřovací kód je 1234",
  "to": [{ "phone_number": "420777123456" }],
  "flow": [{ "sms": { "sender": "MojeFirma", "type": "utf", "ttl": 10 } }]
}
```

SMS optimized for GSM-7 capacity:

```json
{
  "body": "Vas overovaci kod je 1234",
  "to": [{ "phone_number": "420777123456" }],
  "flow": [{ "sms": { "sender": "MojeFirma", "type": "sms" } }]
}
```

Sending from a dedicated virtual number:

```json
{
  "body": "Reply STOP to unsubscribe",
  "to": [{ "phone_number": "420777123456" }],
  "flow": [{ "sms": { "sender": "420900123456", "gateway": "direct" } }]
}
```

## Gotchas

- Alphanumeric senders cannot receive replies; use a virtual number with `gateway: "direct"` for
  two-way SMS (see smsmanager-delivery-reports).
- In some countries/operators alphanumeric senders are not supported — test per destination.
- `ttl` is minutes, not seconds.
