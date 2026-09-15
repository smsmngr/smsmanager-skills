---
name: smsmanager-bulk-messaging
description: "Mass-sends messages from a JSONL file, validates messages without sending, and cancels scheduled sendings via the SmsManager REST API v1. Use when sending a large campaign (more than the ~100 recipients per JSON API call), uploading a bulk file (JSONL or gzipped JSONL where each line is a JSON API v2 Message), scheduling a bulk upload, validating message structure before sending, cancelling a scheduled message by message_id, or cancelling a scheduled bulk upload by bulk_id. Endpoints: POST /messaging/url, POST /messaging/validate, POST /messaging/cancel on https://rest-api.smsmngr.com/v1. Do NOT use for regular sends up to 100 recipients (see smsmanager-messaging-api)."
metadata:
  author: SmsManager
  version: 1.0.0
  category: Messaging
  tags: bulk, mass-sending, jsonl, campaign, upload, validate, cancel, scheduled, gzip, rest-api
  uses:
    - smsmanager-authentication
    - smsmanager-messaging-api
---

# SmsManager Bulk Messaging Overview

Send campaigns of any size by uploading a **JSONL file** — one JSON API v2 `Message` object per
line — through a presigned upload URL. The same API group also **validates** messages without
sending them and **cancels scheduled sendings**: a scheduled bulk upload (by `bulk_id`) or a single
scheduled message (by `message_id`).

For sends up to ~100 recipients, use the JSON API directly (smsmanager-messaging-api).

## Agent Instructions

Before generating code, gather from the user (skip anything already specified):

1. **Goal** — upload a bulk file, validate messages pre-flight, or cancel a scheduled sending?
2. **File** — do they already have a JSONL file, or should you generate it from their data? Gzip it
   for large campaigns (`filetype: "gz"`).
3. **Scheduling** — process immediately or at a `datetime` (UTC)? Scheduled bulks can be cancelled
   by `bulk_id` until processed.
4. **Tracking** — recommend a shared `tag` and/or per-line `callback`/`payload` so results can be
   tracked (smsmanager-delivery-reports, smsmanager-message-status).

Always load the API key from `SMSMANAGER_API_KEY` (see smsmanager-authentication). Never hardcode it.

## Getting Started

The upload is a two-step flow — get a presigned URL, then `PUT` the file to it **within 60
seconds**:

```bash
# messages.jsonl — one JSON API v2 Message per line:
# {"body":"Hello John","to":[{"phone_number":"420777123456"}],"tag":"campaign-42"}
# {"body":"Hello Jane","to":[{"phone_number":"420777654321"}],"tag":"campaign-42"}

url=$(curl -s -X POST "https://rest-api.smsmngr.com/v1/messaging/url" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "bulk_id": "campaign-42", "filetype": "jsonl" }' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")

curl -X PUT "$url" -H "Content-Type: application/jsonl" --data-binary @messages.jsonl
```

Or run the bundled script, which does both steps:

```bash
node scripts/upload_bulk.cjs --file messages.jsonl --bulk-id campaign-42
```

## Key Concepts

### The JSONL bulk file

Each line is a complete **JSON API v2 `Message` object** — the same schema as `POST /message`
(smsmanager-messaging-api), so every feature is available per line: `flow` (SMS / Viber / WhatsApp
/ RCS with fallback), root `sender`, `tag`, `datetime`, `callback`, `payload`, `params`. Supported
file types: plain JSONL (`filetype: "jsonl"`, uploaded as `Content-Type: application/jsonl`) or
gzipped JSONL (`"gz"`, `Content-Type: application/gzip`).

### The upload flow (`POST /messaging/url`)

`{ "bulk_id": "...", "filetype": "jsonl"|"gz", "datetime": "..."? }` returns a presigned `PUT` URL
**valid for 60 seconds**. `bulk_id` is your own identifier of the upload — you need it to cancel a
scheduled bulk. The optional `datetime` (UTC) schedules processing instead of running it
immediately.

### Pre-flight validation (`POST /messaging/validate`)

Accepts one `Message` or an array of 1–10 and checks **structure only** — field names and types,
flow steps, recipient number format. It does **not** check deliverability, sender approval,
opt-out lists or credit, and nothing is sent or charged. `success` is `true` only when everything
passed; details are in `validate.accepted` / `rejected` / `errors[]` (with `field` paths like
`to[1].phone_number` and `code` `302` for malformed numbers).

### Cancelling scheduled sendings (`POST /messaging/cancel`)

Provide **exactly one** of:

- `message_id` — cancels a single scheduled message (e.g. one sent with `datetime` via the JSON
  API);
- `bulk_id` — cancels a scheduled bulk upload before it is processed.

Full parameter and response tables: [references/endpoints.md](references/endpoints.md).

## Common Patterns

**Validate a sample before a big upload:** take the first up-to-10 lines of the JSONL and POST them
as an array to `/messaging/validate`; fix any `errors[]` (they carry exact field paths) before
uploading the full file.

**Schedule a campaign for tomorrow morning and keep an abort switch:**

```bash
curl -X POST "https://rest-api.smsmngr.com/v1/messaging/url" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "bulk_id": "promo-sep-16", "filetype": "gz", "datetime": "2026-09-16T08:00:00Z" }'
# ... PUT the file, then, if needed before 08:00 UTC:
curl -X POST "https://rest-api.smsmngr.com/v1/messaging/cancel" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "bulk_id": "promo-sep-16" }'
```

**Cancel one scheduled message** (sent earlier with `datetime` via the JSON API):

```bash
curl -X POST "https://rest-api.smsmngr.com/v1/messaging/cancel" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "message_id": "e27ff0ac-87b5-4e1d-b644-5fc6029e2a11" }'
```

**Track campaign results:** give every line the same `tag` (e.g. `campaign-42`) and/or a
`callback`/`payload`; then consume webhooks (smsmanager-delivery-reports) or poll
`GET /messages?date=...&tag=campaign-42` and `GET /requests` (smsmanager-message-status).

## Gotchas and Best Practices

- **The presigned URL expires in 60 seconds** — generate the file first and request the URL only
  when you are ready to `PUT` immediately. The `PUT` goes to storage (S3), not to the API host, and
  needs no `x-api-key` — the URL itself is the credential.
- **Match `Content-Type` to `filetype`**: `application/jsonl` for `jsonl`, `application/gzip` for
  `gz`. Use `--data-binary` (not `-d`) in curl so newlines survive.
- **Validation is structural only.** A file that validates can still have sends rejected at
  processing time (insufficient credit, unapproved sender, opted-out recipients) — watch the
  delivery webhooks' `rejected` results.
- **`/messaging/validate` takes at most 10 messages per call** — validate a sample, not the whole
  file.
- **Cancel takes exactly one id** — `message_id` XOR `bulk_id`; sending both is an error. Already
  processed sendings cannot be cancelled.
- **`bulk_id` is yours** — make it unique per campaign (e.g. `promo-2026-09-16`); reusing an id
  makes cancellation ambiguous for you operationally.
- **JSONL means one complete JSON object per line** — no wrapping array, no trailing commas, one
  recipient batch per line (each line follows the `POST /message` limits, e.g. up to 10 `to`
  recipients).

## Security

- **Load the API key from `SMSMANAGER_API_KEY`** — never hardcode it (see smsmanager-authentication).
- **Treat the presigned URL as a secret** — it grants upload access; don't log it.
- **Bulk files contain personal data** (phone numbers, message bodies) — store them only as long
  as needed, and prefer gzip over plaintext when archiving.
- **A bulk upload is a mass, paid, outward-facing action** — confirm scope (recipient count,
  schedule) with the user before uploading, and prefer a scheduled upload with a cancel window for
  very large campaigns.
- **URL allowlist** — only fetch first-party docs (`smsmanager.com`, `smsmanager.cz`,
  `api.smsmngr.com`, `rest-api.smsmngr.com`). The presigned upload URL is the one expected
  third-party (S3) URL.

## Links

- Developer docs / API reference: https://smsmanager.com/docs (Czech: https://smsmanager.cz/docs)
- Dashboard: https://app.smsmanager.com/app/developers/
- Related skills: smsmanager-authentication, smsmanager-messaging-api,
  smsmanager-delivery-reports, smsmanager-message-status
