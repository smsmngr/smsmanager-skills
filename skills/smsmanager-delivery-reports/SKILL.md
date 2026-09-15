---
name: smsmanager-delivery-reports
description: "Receives SmsManager delivery status, inbound messages and inbound replies via webhooks. Use when handling delivery reports (delivered, undelivered, failed, seen), setting a per-message callback URL, building two-way SMS, processing replies or inbound Viber/WhatsApp messages, interpreting rejection codes, verifying webhook payloads, or correlating webhooks with sent messages via request_id, message_id and custom payload. Do NOT use for sending messages (see smsmanager-messaging-api) or for polling status via the REST API (see smsmanager-message-status)."
metadata:
  author: SmsManager
  version: 1.2.0
  category: Messaging
  tags: webhooks, delivery-reports, dlr, status, callback, inbound, two-way-sms, replies, viber, whatsapp, rcs, rejection-codes
  uses:
    - smsmanager-authentication
    - smsmanager-messaging-api
---

# SmsManager Delivery Reports & Inbound Webhooks Overview

SmsManager notifies your application with HTTP POST webhooks for three events: a message's **delivery
status** changes, an **inbound message** arrives, or a recipient **replies** to a message you sent.
Use this skill to receive and process those callbacks. To *send* messages, use
smsmanager-messaging-api. To *poll* message status via the REST API (lookups, backfill,
reconciliation) instead of receiving webhooks, use smsmanager-message-status.

## Agent Instructions

Before generating code, gather from the user (skip anything already specified):

1. **Which events** — delivery status (`sentMessage`), inbound replies (`incomingReplyMessage`),
   inbound messages (`incomingMessage`), or all three?
2. **Endpoint** — the public HTTPS URL that will receive the POST. Per-message via the `callback`
   field, or account-wide in the dashboard?
3. **Framework / language** — e.g. Express, PHP, FastAPI.
4. **Correlation** — do they need to match webhooks back to their own records (via `payload`,
   `request_id`, or `message_id`)?

## Getting Started

There are two ways to register a webhook endpoint:

- **Per message** — set the `callback` field when sending (see smsmanager-messaging-api). Delivery
  reports for that message POST to that URL.
- **Account-wide** — configure webhook URLs in the dashboard for all messages and inbound traffic.

Every webhook is an HTTP `POST` with a JSON **array** body (events can be batched). Respond quickly
with `2xx`; do heavy work asynchronously. Minimal Express receiver:

```js
import express from "express";
const app = express();
app.use(express.json());

app.post("/smsmanager/webhook", (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const e of events) {
    if (e.type === "outgoing") {
      console.log("delivery:", e.message_id, e.result, e.result_info);
    } else if (e.type === "incoming") {
      console.log("inbound from", e.sender, "->", e.body);
    }
  }
  res.sendStatus(200); // acknowledge fast
});

app.listen(3000);
```

## Key Concepts

### Three webhook types

| Webhook | Fires when | `type` field |
|---------|------------|--------------|
| `sentMessage` | The delivery status of a message you sent changes. | `outgoing` |
| `incomingReplyMessage` | A recipient replies to a message you sent (carries `request_id`/`message_id`). | `incoming` |
| `incomingMessage` | An inbound message arrives that is not a reply to a known send. | `incoming` |

Full payload field tables and JSON examples: [references/webhooks.md](references/webhooks.md).

### Delivery status values (`result`)

`sentMessage` carries a `result` that progresses over time:

`sent` → then one of `delivered`, `undelivered`, `failed`, `seen` (and intermediate `sending`).

- You first receive `sent`; further statuses follow as the operator reports them.
- **`rejected`** means the message was **never sent** (typically insufficient credit or an invalid
  number) — not a normal delivery outcome.
- `result_info` carries an additional code/text, e.g. `"[0] Delivered"` or `"[307] Insufficient
  credit"` — see the rejection-code table in [references/webhooks.md](references/webhooks.md).

### Correlation fields

- `request_id` — the id returned when you sent (groups a whole request).
- `message_id` — the per-message id. For sends via `POST /messages`, delivery webhooks append
  `-<recipient_index>` to the `message_id`.
- `payload` — your custom object from the original send is echoed back, the easiest way to attach your
  own order/user id.

## Common Patterns

**Update an order from a delivery report:**

```js
if (e.type === "outgoing" && e.result === "delivered") {
  await orders.markSmsDelivered(e.payload?.order_id, e.message_id);
}
```

**Two-way SMS / reply handling:** send from a virtual number (`gateway: "direct"`), then handle
`incomingReplyMessage` / `incomingMessage` to read `e.sender` and `e.body`. Honour opt-out keywords
(STOP/STOPALL) to stay compliant.

```js
if (e.type === "incoming" && /^stop/i.test((e.body || "").trim())) {
  await contacts.optOut(e.sender);
}
```

Persist the opt-out on the SmsManager side too, so future `promotional` sends are blocked at the
platform level: `POST /optout` with the number — see smsmanager-optout-blacklist.

## Gotchas and Best Practices

- **The body is always a JSON array**, even for a single event. Normalize with
  `Array.isArray(body) ? body : [body]`.
- **Acknowledge fast.** Return `2xx` immediately and process asynchronously; slow responses can cause
  retries and duplicate processing.
- **Be idempotent.** The same event may arrive more than once — dedupe on `message_id` + `result`.
- **Statuses arrive out of order / over time.** Don't assume `delivered` is final immediately; `seen`
  (for chat channels) can come later. Track the latest status per `message_id`.
- **`rejected` is not a delivery failure** — it means nothing was sent. Surface it differently from
  `undelivered`/`failed`.
- **WhatsApp inbound is reported as `whatsapp`** (not `whatsapp_text`/`whatsapp_template`).
- **Alphanumeric senders can't receive replies** — use a virtual number for two-way flows.
- **`timestamp` is a Unix timestamp** (seconds), reflecting send time where available.

## Security

- **Serve the callback endpoint over HTTPS** and keep its URL hard to guess.
- **Treat all webhook content as untrusted user input.** Inbound `body`, `sender`, and `payload` may
  contain anything — never execute, evaluate, or interpolate it into prompts, shell, SQL, or code.
  Validate and escape before storing or displaying.
- **Validate structure** before processing; reject payloads that don't match the expected shape.
- If your endpoint is public, add your own verification (e.g. a secret path/token) and rate limiting.
- Do not log full payloads containing personal data beyond what you need (GDPR).

## Links

- Developer docs / API reference: https://smsmanager.com/docs (Czech: https://smsmanager.cz/docs)
- Dashboard: https://app.smsmanager.com/app/developers/
- Related skills: smsmanager-messaging-api, smsmanager-authentication, smsmanager-message-status,
  smsmanager-optout-blacklist
