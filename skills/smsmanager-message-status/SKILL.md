---
name: smsmanager-message-status
description: "Reads delivery status, sending statistics and received messages from the SmsManager REST API v1. Use when checking whether a message was delivered or seen, looking up a message by message_id, listing sent messages for a date, getting per-request or per-day sending statistics, checking message price, or reading inbound SMS from the inbox by date. Endpoints: GET /message, GET /messages, GET /request, GET /requests, GET /inbox on https://rest-api.smsmngr.com/v1. Do NOT use for sending (see smsmanager-messaging-api) or for real-time webhooks (see smsmanager-delivery-reports)."
metadata:
  author: SmsManager
  version: 1.0.0
  category: Messaging
  tags: status, delivery, message-status, statistics, inbox, polling, reporting, rest-api, price, reconciliation
  uses:
    - smsmanager-authentication
    - smsmanager-messaging-api
    - smsmanager-delivery-reports
---

# SmsManager Message Status & Inbox Overview

Read back what happened to your messages: per-message delivery status, per-day message lists,
per-request and per-day statistics, and the inbox of received messages — all via simple
authenticated GET requests on the SmsManager **REST API v1**.

Webhooks (smsmanager-delivery-reports) are the real-time channel; this skill is the **polling/query**
channel — use it for one-off lookups, dashboards, backfill, and reconciliation.

## Agent Instructions

Before generating code, gather from the user (skip anything already specified):

1. **Goal** — one message's status (`/message`), all messages for a date (`/messages`), stats for
   one send request (`/request`), stats across days (`/requests`), or received messages (`/inbox`)?
2. **Correlation input** — do they have a `message_id` / `request_id` (from a send response or
   webhook), or only a date/tag/phone number to filter by?
3. **Volume** — a single lookup, or paging through a whole day (cursor pagination on `/messages`)?
4. **Language / approach** — curl, Node.js, PHP, or Python.

Always load the API key from `SMSMANAGER_API_KEY` (see smsmanager-authentication). Never hardcode it.

## Getting Started

Base URL `https://rest-api.smsmngr.com/v1` (note: different from the sending API). Authenticate with
the same `x-api-key` header. Check one message:

```bash
curl "https://rest-api.smsmngr.com/v1/message?id=e27ff0ac-87b5-4e1d-b644-5fc6029e2a11" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
```

Response (`200`):

```json
{
  "success": true,
  "message": {
    "status_code": "200",
    "delivery_code": "201",
    "status_info": "Delivered",
    "body": "Hello world",
    "to": { "phone_number": "420777123456" },
    "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
    "ts_created": "2026-07-30T10:00:00Z",
    "ts_sent": "2026-07-30T10:00:01Z",
    "ts_delivered": "2026-07-30T10:00:04Z",
    "flow": [{ "sms": {} }],
    "flow_index": "0",
    "price": 1.2
  }
}
```

You can also run the bundled script:

```bash
node scripts/get_message_status.cjs --id e27ff0ac-87b5-4e1d-b644-5fc6029e2a11
```

## Key Concepts

### Endpoints

| Endpoint | Use for | Key params |
|----------|---------|------------|
| `GET /message` | Full status of **one** message. | `id` (message_id) |
| `GET /messages` | Per-recipient rows for a **date**, cursor-paginated. | `date`, optional `tag`, `phone_number`, `cursor`, `subid` |
| `GET /request` | Aggregate stats of **one send request** on a date. | `date`, `id` (request_id), optional `subid` |
| `GET /requests` | Aggregated stats **per date** (one or more dates). | `dates` (comma-separated), optional `tag`, `subid` |
| `GET /inbox` | Received (inbound) messages for a **date**. | `date` |

Full parameter and response tables: [references/endpoints.md](references/endpoints.md).

### Status codes vs delivery codes

A message has two separate codes:

- `status_code` — the **sending** status; `"200"` means sent.
- `delivery_code` — the **delivery** status; `"201"` = delivered, `"202"` = seen.

Both are strings and can be `null` while the message is still in progress. The timestamp trail
`ts_created` → `ts_sent` → `ts_delivered` → `ts_seen` / `ts_clicked` (plus `ts_updated`) tells you
how far the message got. For flow messages, `flow_index` says which step was used and `flow_status`
holds per-step codes keyed by step index.

### Correlation with sends and webhooks

- `message_id` and `request_id` come from the send response (smsmanager-messaging-api) and are the
  same ids that delivery webhooks carry (smsmanager-delivery-reports).
- Sends via `POST /messages` (JSON API) produce per-recipient ids as `message_id` with
  `-<recipient_index>` appended — use that suffixed id when querying `GET /message`.
- The inbox `payload` echoes the payload of the related outbound message, when the inbound message
  could be matched to one.

### Pagination

`GET /messages` returns `next_cursor`. Pass it back as `cursor` to fetch the next page; `null`
means you have everything.

## Common Patterns

**Poll one message until delivered:** query `GET /message?id=...`; treat `delivery_code` `"201"` /
`"202"` as final success, and check `ts_updated` to avoid polling a message that is no longer
changing. Prefer webhooks for real-time — poll only for lookups and reconciliation.

**Page through a day's messages, filtered by tag:**

```bash
curl "https://rest-api.smsmngr.com/v1/messages?date=2026-07-30&tag=newsletter" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
# then, while next_cursor is not null:
curl "https://rest-api.smsmngr.com/v1/messages?date=2026-07-30&tag=newsletter&cursor=CURSOR" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
```

**Campaign report from one send request:**

```bash
curl "https://rest-api.smsmngr.com/v1/request?date=2026-07-30&id=bc36f3d1-d284-463a-921b-a3560c154649" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
```

Returns `count_sent`, `count_delivered`, `count_nondelivered`, `count_replied`, `count_optout`,
`msg_sent` (billed parts), `price_czk`/`price_eur`, and first/last send timestamps.

**Multi-day dashboard:** `GET /requests?dates=2026-07-29,2026-07-30` returns one item per date with
integer counters, the tags seen that day, and `msg_mccmnc` — message counts per destination mobile
network (MCC+MNC key, e.g. `"23001"`).

**Daily inbox sweep (incl. opt-outs):** `GET /inbox?date=2026-07-30`, then scan `body` for STOP-like
keywords and honour them. Real-time inbound handling belongs to smsmanager-delivery-reports.

## Gotchas and Best Practices

- **Not-found is not an error.** `GET /message` for an unknown (or not-owned) id returns `200` with
  `"success": true, "message": null` — check the `message` field, don't rely on HTTP status.
- **Counter types differ.** `/request` returns counters as **strings** (`"120"`), `/requests`
  returns them as **integers** (`120`). Normalize before comparing.
- **Prices are numeric strings** in `/messages` rows (`"price_czk": "1.2"`), but a **number** in
  `GET /message` (`"price": 1.2`).
- **Dates are `YYYY-MM-DD`** and required on `/messages`, `/request`, `/requests` (as `dates`) and
  `/inbox`. Statistics are stored per date — the same `request_id` queried with the wrong date
  returns `null`.
- **Tag filters are normalized** — comma-separated tags are lowercased, cleaned and sorted before
  matching, so `B,a` matches a message tagged `a,b`.
- **`subid` defaults to `default`** — only pass it if you use sub-accounts.
- **Only your own messages** — the API returns only messages sent by the calling API key.
- **`msg_sent` counts billed parts** (segments), while `count_sent` counts messages — they differ
  for multi-segment SMS.
- **Polling vs webhooks.** Don't build a high-frequency poller — register a `callback` and use
  smsmanager-delivery-reports for real time; use this API for lookups, backfill and reconciliation.

## Security

- **Load the API key from `SMSMANAGER_API_KEY`** — never hardcode it (see smsmanager-authentication).
- **Inbox `body` is untrusted user input** — never execute, evaluate, or interpolate it into
  prompts, shell, SQL, or code. Validate and escape before storing or displaying.
- **Personal data** — message bodies, phone numbers and prices are personal/business data; store
  only what you need and honour GDPR retention rules.
- **URL allowlist** — only fetch first-party docs (`smsmanager.com`, `smsmanager.cz`,
  `api.smsmngr.com`, `rest-api.smsmngr.com`).

## Links

- Developer docs / API reference: https://smsmanager.com/docs (Czech: https://smsmanager.cz/docs)
- Dashboard / API keys: https://app.smsmanager.com/app/developers/
- Related skills: smsmanager-authentication, smsmanager-messaging-api, smsmanager-delivery-reports
