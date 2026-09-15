---
name: smsmanager-optout-blacklist
description: "Manages the SmsManager opt-out list and blacklist via the REST API v1. Use when adding a recipient to the opt-out list (unsubscribe), reading or downloading the opt-out or blacklist numbers, removing a number from a list (re-subscribe), wiping a list, importing suppression lists, honouring STOP replies persistently, or understanding why a message was rejected with code 304. Endpoints: GET/POST/DELETE /optout and GET/POST/DELETE /blacklist on https://rest-api.smsmngr.com/v1. Do NOT use for sending (see smsmanager-messaging-api) or for receiving the STOP replies themselves (see smsmanager-delivery-reports)."
metadata:
  author: SmsManager
  version: 1.0.0
  category: Messaging
  tags: opt-out, optout, unsubscribe, blacklist, suppression, stop, compliance, gdpr, rest-api, 304
  uses:
    - smsmanager-authentication
---

# SmsManager Opt-out List & Blacklist Overview

Keep recipients who must not be messaged out of your sends. SmsManager maintains two suppression
lists per account: the **opt-out list** (recipients who unsubscribed — applied to messages with the
`promotional` tag) and the **blacklist** (numbers blocked from your sends). Both are managed with
the same three operations on the REST API v1: download, add numbers, remove numbers.

Messages to a listed number are rejected with `result_info` code `[304]` (see
smsmanager-delivery-reports).

## Agent Instructions

Before generating code, gather from the user (skip anything already specified):

1. **Which list** — the opt-out list (`/optout`, unsubscribes, applies to `promotional` sends) or
   the blacklist (`/blacklist`, blocked numbers)?
2. **Operation** — add numbers, read/download the list, remove specific numbers, or wipe the list?
3. **Volume** — a single number or a bulk import (the `to` field takes many newline-separated
   numbers in one call)?

Always load the API key from `SMSMANAGER_API_KEY` (see smsmanager-authentication). Never hardcode
it. **Wiping a list (`all: true`) is destructive** — confirm with the user before running it.

## Getting Started

Base URL `https://rest-api.smsmngr.com/v1`, auth via the `x-api-key` header. Add a recipient to the
opt-out list:

```bash
curl -X POST "https://rest-api.smsmngr.com/v1/optout" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "420777123456" }'
```

Response (`200`):

```json
{ "success": true, "accepted": 1, "invalid": [] }
```

Read the list back (returns a short-lived download URL for a CSV):

```bash
url=$(curl -s "https://rest-api.smsmngr.com/v1/optout" \
  -H "x-api-key: $SMSMANAGER_API_KEY" | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")
curl -s "$url" -o optout.csv
```

## Key Concepts

### Two lists, one interface

| List | Endpoint | Applies to |
|------|----------|------------|
| **Opt-out list** | `/optout` | Messages with the `promotional` tag (the default tag). Recipients who unsubscribed. |
| **Blacklist** | `/blacklist` | Numbers blocked from your sends. |

Both endpoints support `GET` (download), `POST` (add) and `DELETE` (remove/wipe), all with an
optional `subid` (sub-account, default `default`). Full tables:
[references/endpoints.md](references/endpoints.md).

### Adding numbers (`POST`)

- `to` is a **newline-separated string** of phone numbers — not a JSON array:
  `"420777123456\n420777654321"`.
- Numbers are normalized (a Czech 9-digit mobile number gets `420` prepended) and processed
  **asynchronously** — the response reports `accepted` (count of unique valid numbers) and
  `invalid` (lines that could not be parsed); the list itself updates shortly after.

### Reading a list (`GET`)

`GET` does not return the numbers inline. It returns a **presigned CSV download URL valid for 60
seconds** — fetch it immediately, server-side.

### Removing numbers (`DELETE`)

Send `to` (newline-separated numbers) to remove specific entries, or `all: true` to wipe the entire
list. The response reports `removed`, `remaining`, `invalid`, or `wiped: true`.

## Common Patterns

**Persist a STOP reply** (from a webhook or inbox sweep — see smsmanager-delivery-reports /
smsmanager-message-status):

```js
// e is an incoming webhook event
if (/^stop/i.test((e.body || "").trim())) {
  await fetch("https://rest-api.smsmngr.com/v1/optout", {
    method: "POST",
    headers: { "x-api-key": process.env.SMSMANAGER_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ to: e.sender }),
  });
}
```

**Bulk import a suppression list:** join the numbers with `\n` into one `to` string and POST once —
no need for a call per number.

**Re-subscribe a recipient** (they opted back in):

```bash
curl -X DELETE "https://rest-api.smsmngr.com/v1/optout" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "420777123456" }'
```

**Audit the blacklist:** `GET /blacklist` → download the CSV within 60 seconds → parse server-side.

## Gotchas and Best Practices

- **`to` is a newline-separated string, not an array.** Sending a JSON array fails.
- **The download URL expires in 60 seconds** — request it right before downloading, and download
  server-side. The storage bucket has no CORS headers, so a browser `fetch()` of the URL fails;
  from a web app the only option is opening it in a new tab (`window.open`).
- **An empty list returns HTTP `404`** with `{"success": true, "message": "Optout not found"}` —
  treat it as "no numbers yet", not as an error.
- **Adds are asynchronous.** A number you just POSTed may take a moment to appear in the downloaded
  CSV and to start blocking sends.
- **Opt-out only guards `promotional` sends.** Messages tagged `transactional` or `priority` are
  not filtered by the opt-out list — never route marketing through those tags to bypass opt-outs.
- **Rejection code `[304]`** in delivery webhooks means the recipient was on one of these lists at
  send time.
- **`DELETE` with `all: true` wipes the whole list** irreversibly — confirm first, and consider
  downloading a backup CSV before wiping.

## Security

- **Load the API key from `SMSMANAGER_API_KEY`** — never hardcode it (see smsmanager-authentication).
- **Suppression lists are personal data** (phone numbers + the fact someone unsubscribed) — store
  downloaded CSVs only as long as needed and honour GDPR.
- **Honour opt-outs beyond the API**: keep your own records in sync so a wiped or edited list never
  resurrects unsubscribed recipients.
- **URL allowlist** — only fetch first-party docs (`smsmanager.com`, `smsmanager.cz`,
  `api.smsmngr.com`, `rest-api.smsmngr.com`). The presigned download URL is the one expected
  third-party (S3) URL.

## Links

- Developer docs / API reference: https://smsmanager.com/docs (Czech: https://smsmanager.cz/docs)
- Dashboard: https://app.smsmanager.com/app/developers/
- Related skills: smsmanager-authentication, smsmanager-messaging-api, smsmanager-delivery-reports,
  smsmanager-message-status
