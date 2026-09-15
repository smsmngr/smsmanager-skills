← [Back to smsmanager-bulk-messaging SKILL.md](../SKILL.md)

# Endpoints reference — bulk messaging (JSONL upload, validate, cancel)

Base URL: `https://rest-api.smsmngr.com/v1`. Auth: `x-api-key` header (the presigned `PUT` itself
needs no header — the URL is the credential).

---

## POST /messaging/url — get a bulk upload URL

| Body field | Required | Notes |
|------------|----------|-------|
| `bulk_id` | yes | Your identifier of the bulk upload (used by `/messaging/cancel`). |
| `filetype` | yes | `jsonl` or `gz` (gzipped JSONL). |
| `datetime` | no | Scheduled processing time (UTC). Omit to process right after upload. |

Response (`200`):

```json
{ "success": true, "url": "https://…s3.amazonaws.com/…&X-Amz-Expires=60…" }
```

Then upload within **60 seconds**:

```bash
curl -X PUT "$url" -H "Content-Type: application/jsonl" --data-binary @messages.jsonl
# or for filetype "gz":
curl -X PUT "$url" -H "Content-Type: application/gzip" --data-binary @messages.jsonl.gz
```

The file: one JSON API v2 `Message` object per line (same schema as `POST /message` — see
smsmanager-messaging-api), e.g.:

```
{"body":"Hello John","to":[{"phone_number":"420777123456"}],"tag":"campaign-42","payload":{"user_id":"1"}}
{"to":[{"phone_number":"420777654321"}],"tag":"campaign-42","flow":[{"viber":{"body":"Hi!","sender":"Mojefirma","ttl":10}},{"sms":{"body":"Hi!","sender":"Mojefirma"}}]}
```

Errors: `400` (`Missing 'bulk_id' or 'filetype' or 'datetime' in request data`,
`Unsupported filetype`), `500` (`Failed to generate upload URL`).

---

## POST /messaging/validate — validate without sending

Body: **one `Message` object** (like `POST /message`) or **an array of 1–10 `Message` objects**
(like `POST /messages`). Checks structure only — fields and types, flow steps, recipient number
format. Deliverability, sender approval, opt-out lists and credit are **not** checked; nothing is
sent or charged.

Response (`200` — returned even when the content is invalid; check `success`):

```json
{
  "success": false,
  "validate": {
    "accepted": [ { "key": "0", "phone_number": "420777123456" } ],
    "rejected": [ { "key": "1", "phone_number": "123" } ],
    "errors": [
      { "key": "1", "field": "to[1].phone_number", "message": "Phone number is not in a valid format", "code": "302" }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| `success` | `true` only when `rejected` and `errors` are both empty. |
| `accepted[]` / `rejected[]` | For a single message, `key` indexes recipients in `to` (and `phone_number` is present); for an array request, `key` indexes the submitted array. |
| `errors[]` | Always present. `field` is the invalid field's path (e.g. `flow[0].sms.gateway`); `key` joins to the `rejected` entry; `code` is an internal status code where one exists (`302` = malformed number). |

Errors: `400` (`Missing request body`, `Request must contain 1 to 10 messages`).

---

## POST /messaging/cancel — cancel a scheduled message or bulk upload

Provide **exactly one** of the two fields:

| Body field | Notes |
|------------|-------|
| `message_id` | Id of a scheduled single message (e.g. sent with `datetime` via the JSON API). |
| `bulk_id` | Id of a scheduled bulk upload (from `/messaging/url`). |

Response (`200`):

```json
{ "success": true, "message": "Schedule cancelled" }
```

Errors: `400` (`Missing 'message_id' or 'bulk_id' in request data`), `500`
(`Failed to cancel schedule`).

## Links

- Developer docs / API reference: https://smsmanager.com/docs
- Message schema for JSONL lines: see smsmanager-messaging-api
- Tracking sent campaigns: see smsmanager-message-status / smsmanager-delivery-reports
