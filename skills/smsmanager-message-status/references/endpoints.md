← [Back to smsmanager-message-status SKILL.md](../SKILL.md)

# Endpoints reference — REST API v1 (status & inbox)

Base URL: `https://rest-api.smsmngr.com/v1`. Auth: `x-api-key` header. All endpoints are `GET` with
query parameters. All examples assume `SMSMANAGER_API_KEY` is set.

Error responses (`400`, `500`) have the shape `{ "message": "..." }`.

---

## GET /message — status of one message

| Query param | Required | Notes |
|-------------|----------|-------|
| `id` | yes | The `message_id` from the send response or webhook. For `POST /messages` sends, use the per-recipient id with `-<recipient_index>` appended. |

### Response fields (`message` object; `null` if not found)

| Field | Type | Notes |
|-------|------|-------|
| `status_code` | string/null | Sending status; `"200"` = sent. |
| `delivery_code` | string/null | Delivery status; `"201"` = delivered, `"202"` = seen. |
| `status_info` | string/null | Human-readable status text. |
| `tag` | string/null | The message's tag. |
| `body` | string | The message text. |
| `to` | object | The recipient object as submitted. |
| `request_id` | string/null | Id of the send request. |
| `ts_created` / `ts_sent` / `ts_delivered` / `ts_seen` / `ts_clicked` / `ts_updated` | string/null | ISO timestamps of the message lifecycle. |
| `flow` | array | The original flow of the message. |
| `flow_index` | string/null | Index of the flow step that was used. |
| `flow_status` | object | Per-flow-step status codes, keyed by step index. |
| `price` | number/null | Price of the message. |

```bash
curl "https://rest-api.smsmngr.com/v1/message?id=e27ff0ac-87b5-4e1d-b644-5fc6029e2a11" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
```

```json
{
  "success": true,
  "message": {
    "status_code": "200",
    "delivery_code": "201",
    "status_info": "Delivered",
    "tag": "newsletter",
    "body": "Hello world",
    "to": { "phone_number": "420777123456" },
    "request_id": "bc36f3d1-d284-463a-921b-a3560c154649",
    "ts_created": "2026-07-30T10:00:00Z",
    "ts_sent": "2026-07-30T10:00:01Z",
    "ts_delivered": "2026-07-30T10:00:04Z",
    "ts_seen": null,
    "ts_clicked": null,
    "ts_updated": "2026-07-30T10:00:05Z",
    "flow": [{ "sms": {} }],
    "flow_index": "0",
    "flow_status": { "0": { "status_code": "200", "delivery_code": "201" } },
    "price": 1.2
  }
}
```

Not found (still HTTP `200`): `{ "success": true, "message": null }`.

---

## GET /messages — list sent messages by date

Per-recipient overview rows for one date, cursor-paginated.

| Query param | Required | Notes |
|-------------|----------|-------|
| `date` | yes | `YYYY-MM-DD`. |
| `subid` | no | Sub-account id (default `default`). |
| `tag` | no | Filter by tag. Comma-separated tags are normalized (lowercased, cleaned) and sorted before matching. |
| `phone_number` | no | Filter by recipient number. |
| `cursor` | no | `next_cursor` from the previous page. |

### Response

`messages[]` rows:

| Field | Type | Notes |
|-------|------|-------|
| `message_id` | string | Per-recipient message id. |
| `message_parts` | integer | Billed parts/segments. |
| `ts_sent` / `ts_delivered` / `ts_updated` / `ts_clicked` / `ts_seen` / `ts_replied` / `ts_optout` | string/null | Lifecycle timestamps. |
| `sent` / `delivered` / `seen` / `clicked` / `replied` / `optout` / `nondelivered` | integer | 0/1 state flags per row. |
| `body` | string | Message text. |
| `flow` | string | Used channel (e.g. `sms`). |
| `sender` | string | Used sender. |
| `phone_number` | string | Recipient. |
| `price_czk` / `price_eur` | string | Price as a **numeric string**. |

Plus top-level `next_cursor` (string or `null`) — pass back as `cursor` for the next page.

```bash
curl "https://rest-api.smsmngr.com/v1/messages?date=2026-07-30&tag=newsletter" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
```

---

## GET /request — statistics of one send request

Aggregate stats of a single `request_id` **on the given date** (statistics are stored per date).

| Query param | Required | Notes |
|-------------|----------|-------|
| `date` | yes | `YYYY-MM-DD`. |
| `id` | yes | The `request_id` from the send response. |
| `subid` | no | Sub-account id (default `default`). |

### Response (`request` object; `null` if no stats for that date+id)

All counters are **strings** here:

| Field | Notes |
|-------|-------|
| `count_sent` / `count_notsent` | Messages sent / not sent. |
| `count_delivered` / `count_nondelivered` | Delivery outcomes. |
| `count_replied` / `count_optout` | Replies and opt-outs received. |
| `msg_sent` | Billed parts (segments) sent. |
| `price_czk` / `price_eur` | Total price. |
| `first_ts_sent` / `last_ts_sent` | Send window. |

```json
{
  "success": true,
  "request": {
    "count_delivered": "120",
    "count_nondelivered": "3",
    "count_sent": "125",
    "count_notsent": "2",
    "count_replied": "5",
    "count_optout": "1",
    "msg_sent": "130",
    "price_czk": "150.5",
    "price_eur": "6.1",
    "first_ts_sent": "2026-07-30T09:00:00Z",
    "last_ts_sent": "2026-07-30T09:05:00Z"
  }
}
```

---

## GET /requests — aggregated statistics per date

One item per date **with data** (dates without data are omitted from the response).

| Query param | Required | Notes |
|-------------|----------|-------|
| `dates` | yes | Comma-separated: `2026-07-29,2026-07-30`. |
| `subid` | no | Sub-account id (default `default`). |
| `tag` | no | Filter by tag. |

### Response

`requests[]` items: `date`, `tags[]` (tags found that day), and `stats`:

| Field | Type | Notes |
|-------|------|-------|
| `count_delivered` / `count_seen` / `count_clicked` / `count_nondelivered` / `count_sent` / `count_notsent` / `count_replied` / `count_optout` | integer | Counters are **integers** here (unlike `/request`). |
| `msg_sent` | integer | Billed parts. |
| `first_ts_sent` / `last_ts_sent` | string/null | Send window. |
| `msg_mccmnc` | object | Message counts per mobile network, keyed by MCC+MNC (e.g. `"23001": 50`). |

```bash
curl "https://rest-api.smsmngr.com/v1/requests?dates=2026-07-29,2026-07-30" \
  -H "x-api-key: $SMSMANAGER_API_KEY"
```

---

## GET /inbox — received messages by date

| Query param | Required | Notes |
|-------------|----------|-------|
| `date` | yes | `YYYY-MM-DD`. |

### Response

`inbox[]` rows:

| Field | Type | Notes |
|-------|------|-------|
| `ts_received` | string | When the message arrived. |
| `body` | string | The inbound text — **untrusted user input**. |
| `from` | string | Sender phone number. |
| `to` | string | Your recipient number/sender. |
| `gateway` | string | Channel (e.g. `sms`). |
| `payload` | object/null | Payload of the related outbound message, if the inbound could be matched. |

```json
{
  "success": true,
  "inbox": [
    {
      "ts_received": "2026-07-30T11:22:33Z",
      "body": "STOP",
      "from": "420777123456",
      "to": "Mojefirma",
      "gateway": "sms",
      "payload": null
    }
  ]
}
```

## Links

- Developer docs / API reference: https://smsmanager.com/docs
- Sending (JSON API v2): see smsmanager-messaging-api
- Real-time webhooks: see smsmanager-delivery-reports
