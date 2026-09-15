← [Back to smsmanager-optout-blacklist SKILL.md](../SKILL.md)

# Endpoints reference — opt-out list & blacklist

Base URL: `https://rest-api.smsmngr.com/v1`. Auth: `x-api-key` header. `/optout` and `/blacklist`
share the same interface; the examples below show `/optout` — replace the path for the blacklist
(the DELETE response is then nested under `blacklist` instead of `optout`).

All operations accept an optional `subid` (sub-account id, default `default`) — as a query
parameter on `GET`, as a body field on `POST`/`DELETE`.

---

## GET /optout · GET /blacklist — download the list

Returns a presigned URL (valid **60 seconds**) to download the list as CSV.

```bash
curl "https://rest-api.smsmngr.com/v1/optout" -H "x-api-key: $SMSMANAGER_API_KEY"
```

```json
{ "success": true, "url": "https://…s3.amazonaws.com/…&X-Amz-Expires=60…" }
```

- `404` + `{"success": true, "message": "Optout not found"}` — the list has no numbers yet.
- `500` + `{"success": false, "message": "Failed to generate download URL"}`.
- Download the CSV server-side within 60 seconds; the bucket sends no CORS headers (browser
  `fetch` fails — only `window.open` works from a web page).

---

## POST /optout · POST /blacklist — add numbers

| Body field | Required | Notes |
|------------|----------|-------|
| `to` | yes | **Newline-separated string** of phone numbers. Czech 9-digit mobile numbers get `420` prepended; other formats are normalized. |
| `subid` | no | Sub-account id (default `default`). |

```bash
curl -X POST "https://rest-api.smsmngr.com/v1/optout" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "420777123456\n420777654321" }'
```

Response (`200`):

```json
{ "success": true, "accepted": 2, "invalid": [] }
```

- `accepted` — count of unique valid numbers taken for **asynchronous** processing.
- `invalid[]` — input lines that could not be parsed as phone numbers.
- `400` — missing `to` (`{"success": false, "message": "Missing 'to'"}`) or no valid numbers at
  all (then `invalid` lists every line).

---

## DELETE /optout · DELETE /blacklist — remove numbers or wipe

| Body field | Required | Notes |
|------------|----------|-------|
| `to` | yes* | Newline-separated numbers to remove. *Required unless `all` is `true`. |
| `all` | no | `true` deletes the **entire** list. |
| `subid` | no | Sub-account id (default `default`). |

```bash
curl -X DELETE "https://rest-api.smsmngr.com/v1/optout" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "420777123456" }'
```

Response (`200`), nested under the list's key (`optout` here, `blacklist` for `/blacklist`):

```json
{ "success": true, "optout": { "removed": 1, "remaining": 5, "invalid": [] } }
```

Wipe:

```json
{ "success": true, "optout": { "wiped": true } }
```

- `400` — neither `to` nor `all: true` provided.
- `404` — the list does not exist (nothing stored yet).

## Links

- Developer docs / API reference: https://smsmanager.com/docs
- Delivery rejection codes (incl. `[304]`): see smsmanager-delivery-reports
