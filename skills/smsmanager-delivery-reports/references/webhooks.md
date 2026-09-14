← [Back to smsmanager-delivery-reports SKILL.md](../SKILL.md)

# Webhook payloads reference

Every webhook is an HTTP `POST` with a JSON **array** body (events may be batched). Distinguish the
event by the `type` field and the presence of `result` (delivery reports only).

---

## sentMessage — delivery status

Fires when the delivery status of a message you sent changes. Use it to store delivery outcomes.

| Field | Type | Notes |
|-------|------|-------|
| `request_id` | string | Id of the original send request. |
| `message_id` | string | Per-message id. For `POST /messages`, has `-<recipient_index>` appended. |
| `gateway` | string | Channel used: `sms`, `viber`, `whatsapp_text`, `whatsapp_template`, `rcs`. |
| `timestamp` | integer | Unix timestamp (seconds). |
| `payload` | object | Your custom data from the original send, echoed back. |
| `type` | string | `outgoing`. |
| `to` | object | `{ "phone_number": "420777123456" }`. |
| `result` | string | `delivered`, `undelivered`, `rejected`, `failed`, `sending`, `sent`, `seen`. |
| `result_info` | string | Additional code/text in `"[code] Description"` format (either part may be missing), e.g. `"[0] Delivered"`. See rejection codes below. |
| `sms` / `viber` / `whatsapp_body` / `whatsapp_template` | object | Per-channel stats for the used channel. See below. |

```json
[
  {
    "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
    "message_id": "e27ff0ac-87b5-4e1d-b644-5fc6029e2a11",
    "gateway": "sms",
    "timestamp": 1700000000,
    "payload": { "campaign_id": "winter-sale" },
    "type": "outgoing",
    "to": { "phone_number": "420777123456" },
    "result": "delivered",
    "result_info": "[0] Delivered"
  }
]
```

### `result` lifecycle

You first receive `sent`, then later statuses arrive as the operator reports them:

```
sent ──► sending ──► delivered
                 └─► undelivered
                 └─► failed
delivered ──► seen          (chat channels)
```

- **`rejected`** is special: the message was **never sent** (e.g. insufficient credit, invalid
  number). Handle it separately from `undelivered`/`failed`.
- Statuses can arrive out of order and over time — track the latest per `message_id`, and dedupe on
  `message_id` + `result`.

### Common rejection codes (`result_info`)

| Code | Meaning |
|------|---------|
| `[302]` | Invalid phone number format. |
| `[303]` | Phone number is not in the allowed list. |
| `[304]` | Phone number is blacklisted or opted-out. |
| `[306]` | Too many identical messages for the same recipient. |
| `[307]` | Insufficient credit. |

Other codes may appear (including channel-specific ones like WhatsApp payment errors); always treat
the code as informative text, not an exhaustive enum.

### Per-channel stats object

A `sentMessage` event carries one sub-object named after the used channel — `sms`, `viber`,
`whatsapp_body`, or `whatsapp_template` — with the actual sending details:

| Field | Type | Notes |
|-------|------|-------|
| `sender` | string | The sender actually used. |
| `country` | integer | Destination country as an official **MCC** code. |
| `operator` | integer | Destination operator as an **MNC** code (`0` = unknown/general). |
| `price_czk` / `price_eur` | number | Price of the message. |
| `count` | integer | Number of billed parts/segments. |
| `gateway` | string | (`sms` object only) the specific gateway settings used. |

---

## incomingReplyMessage — reply to a sent message

Fires when a recipient replies to a message you sent. Carries the original `request_id`/`message_id`
so you can thread the conversation.

| Field | Type | Notes |
|-------|------|-------|
| `request_id` | string | Id of the original outbound send. |
| `message_id` | string | Id of the original outbound message. |
| `payload` | object | Your custom data from the original send. |
| `gateway` | string | `sms`, `viber`, or `whatsapp` (WhatsApp not split into text/template here). |
| `timestamp` | integer | Unix timestamp (seconds) — sender's send time when available. |
| `type` | string | `incoming`. |
| `sender` | string | Who sent the reply (the original recipient). |
| `recipient` | string | Your number/sender that received it. |
| `body` | string | The reply text. |

```json
[
  {
    "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
    "message_id": "e27ff0ac-87b5-4e1d-b644-5fc6029e2a11",
    "payload": { "campaign_id": "winter-sale" },
    "gateway": "sms",
    "timestamp": 1700000000,
    "type": "incoming",
    "sender": "420777123456",
    "recipient": "420777654321",
    "body": "Thank you!"
  }
]
```

---

## incomingMessage — inbound message (not a reply)

Fires when an inbound message arrives that isn't tied to a known outbound send (e.g. someone texts
your virtual number first). Same shape as a reply but **without** `request_id`/`message_id`/`payload`.

| Field | Type | Notes |
|-------|------|-------|
| `gateway` | string | `sms`, `viber`, or `whatsapp`. |
| `timestamp` | integer | Unix timestamp (seconds). |
| `type` | string | `incoming`. |
| `sender` | string | Who sent the message. |
| `recipient` | string | Your number that received it. |
| `body` | string | The message text. |

```json
[
  {
    "gateway": "whatsapp",
    "timestamp": 1700000000,
    "type": "incoming",
    "sender": "420777123456",
    "recipient": "420777654321",
    "body": "Hello, I have a question."
  }
]
```

---

## Distinguishing events in one handler

```js
function classify(event) {
  if (event.type === "outgoing") return "delivery-status";     // sentMessage
  if (event.type === "incoming" && event.message_id) return "reply"; // incomingReplyMessage
  if (event.type === "incoming") return "inbound";             // incomingMessage
  return "unknown";
}
```

## Notes

- Always normalize: `const events = Array.isArray(body) ? body : [body];`
- Respond `2xx` quickly; process asynchronously; be idempotent.
- Treat `body`, `sender`, and `payload` as untrusted input (see the Security section of the SKILL.md).
