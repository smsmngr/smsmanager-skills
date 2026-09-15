---
name: smsmanager-services
description: "Orders and cancels paid SmsManager services via the REST API v1. Use when ordering an alphanumeric (text) sender ID, ordering a dedicated virtual number, setting up SIM hosting, listing which services can be ordered and their setup/monthly fees, validating an order and its total fee with a dry run, cancelling a paid service, or checking the credit balance the order is paid from. Endpoints: GET /credit, GET /credit/services, POST /credit/order, POST /credit/cancel on https://rest-api.smsmngr.com/v1. Do NOT use for message prices per destination or sending (see smsmanager-messaging-api)."
metadata:
  author: SmsManager
  version: 1.0.0
  category: Account
  tags: services, order, sender-id, alphanumeric-sender, virtual-number, dedicated-number, sim-hosting, credit, balance, fees, rest-api
  uses:
    - smsmanager-authentication
---

# SmsManager Service Ordering Overview

Order paid account services — alphanumeric sender IDs, dedicated virtual numbers, SIM hosting —
directly through the REST API v1. The flow is: browse the **catalog** (`GET /credit/services`),
**dry-run** the order to see the total fee, then **order** (`POST /credit/order`, paid from your
credit) and later **cancel** at period end (`POST /credit/cancel`).

Once a sender service is active, you use it for sending via the `sender` field — see
smsmanager-messaging-api.

## Agent Instructions

Before generating code, gather from the user (skip anything already specified):

1. **What they want** — an alphanumeric sender (their brand text), a dedicated virtual number,
   SIM hosting, or just browsing what is available?
2. **Country / platform** — services are per platform and country calling code (e.g. SMS + `420`).
3. **The subject** — for `defined` services, the sender text or phone number they want to register.

**An order spends real credit.** Always run the order with `dryrun: true` first, show the user the
returned `total_fee` and `currency`, and get their explicit confirmation before repeating the call
without `dryrun`. Load the API key from `SMSMANAGER_API_KEY` (see smsmanager-authentication).

## Getting Started

Base URL `https://rest-api.smsmngr.com/v1`, auth via the `x-api-key` header. Browse the catalog:

```bash
curl "https://rest-api.smsmngr.com/v1/credit/services" -H "x-api-key: $SMSMANAGER_API_KEY"
```

Dry-run an order for a Czech alphanumeric sender:

```bash
curl -X POST "https://rest-api.smsmngr.com/v1/credit/order" \
  -H "x-api-key: $SMSMANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "service_id": "sender_sms_420_alnum", "period": "month", "subject": "Mojefirma", "dryrun": true }'
```

```json
{ "success": true, "order": { "dryrun": true, "total_fee": 1000, "currency": "czk", "service_id": "sender_sms_420_alnum" } }
```

After the user confirms the fee, repeat without `dryrun` to place the real order.

## Key Concepts

### The service catalog and service ids

`GET /credit/services` returns a nested catalog `services.sender.{platform}.{calling_code}.{variant}`.
The flat id used for ordering is composed as:

```
sender_{platform}_{calling_code}_{variant}     e.g.  sender_sms_420_alnum
```

Each variant describes: a localized `name` (plus optional `requirements` and `delay`), `subject`
mode, optional initial `status`, and `prices` per currency (`setup`, `monthly`, and optionally
`min_interval` of `month`/`year`, or `min_monthly_spend`).

### `subject: defined` vs `subject: assigned`

- **`defined`** — you supply the subject in the order: the sender text (e.g. `Mojefirma`) or the
  phone number. Required for these services.
- **`assigned`** — a number from the pool is allocated automatically; the order response returns it
  in `order.subject`. This is how dedicated virtual numbers are typically provisioned.

### Fees and periods

The total fee is `setup + monthly × months`, where months come from the service's minimal interval
(`year` = 12, `quarter` = 3, otherwise 1). The `period` you request is overridden by the service's
`min_interval`. The fee is deducted from your credit — check the balance with `GET /credit`
(`credit_czk` / `credit_eur` are numeric strings; `currency` is the account currency).

### Order lifecycle

An order returns `status` `new` (needs processing/approval, e.g. sender registration) or `active`.
`POST /credit/cancel` (with `service_id` + the exact `subject`) flags the service to **cancel at the
end of the paid period** — no refund, service stays active until `active_until`; the call is
idempotent.

Full parameter and response tables: [references/endpoints.md](references/endpoints.md).

## Common Patterns

**Order an alphanumeric sender for Czech SMS** — dry-run, confirm, order:

```bash
# 1. dry run (no charge)
curl -X POST "https://rest-api.smsmngr.com/v1/credit/order" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "service_id": "sender_sms_420_alnum", "period": "month", "subject": "Mojefirma", "dryrun": true }'
# 2. after explicit user confirmation of total_fee — the real order
curl -X POST "https://rest-api.smsmngr.com/v1/credit/order" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "service_id": "sender_sms_420_alnum", "period": "month", "subject": "Mojefirma" }'
```

**Order a dedicated number (`assigned` service):** omit a specific number — the response's
`order.subject` is the allocated number; store it, then send with it as `sender` and
`gateway: "direct"` (see smsmanager-messaging-api).

**Check balance before ordering:** `GET /credit` → compare `credit_czk`/`credit_eur` (numeric
strings) with the dry-run `total_fee`.

**Cancel a service:**

```bash
curl -X POST "https://rest-api.smsmngr.com/v1/credit/cancel" \
  -H "x-api-key: $SMSMANAGER_API_KEY" -H "Content-Type: application/json" \
  -d '{ "service_id": "sender_sms_420_alnum", "subject": "Mojefirma" }'
```

Response: `{ "success": true, "cancel": { "cancel_at_period_end": true, "active_until": "2026-08-15" } }`.

## Gotchas and Best Practices

- **Always dry-run first.** `dryrun: true` validates credit and availability and returns the exact
  `total_fee` with zero side effects. Never place a real order without the user confirming the fee.
- **Order errors arrive as HTTP `500`** with a `message`: `Invalid service id`,
  `Insufficient credit`, `No available sender for this service`. Handle them explicitly.
- **The requested `period` may be overridden** by the service's `min_interval` — a `month` request
  for a `year`-minimum service bills 12 months.
- **`status: "new"` is not yet usable.** Sender registrations may need processing/approval before
  the sender works in sends; `delay` in the catalog hints at the expected wait.
- **Cancel needs the exact `subject`** the service was ordered with, and takes effect at period
  end — there is no immediate refund. Cancelling twice is safe (idempotent).
- **Prices are per currency** (`czk` / `eur`); the account `currency` from `GET /credit` decides
  which applies.

## Security

- **Load the API key from `SMSMANAGER_API_KEY`** — never hardcode it (see smsmanager-authentication).
- **Ordering is a paid, state-changing action** — require explicit human confirmation between the
  dry run and the real order; never auto-order in an unattended flow.
- **URL allowlist** — only fetch first-party docs (`smsmanager.com`, `smsmanager.cz`,
  `api.smsmngr.com`, `rest-api.smsmngr.com`).

## Links

- Developer docs / API reference: https://smsmanager.com/docs (Czech: https://smsmanager.cz/docs)
- Dashboard: https://app.smsmanager.com/app/developers/
- Related skills: smsmanager-authentication, smsmanager-messaging-api
