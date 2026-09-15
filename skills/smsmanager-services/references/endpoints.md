← [Back to smsmanager-services SKILL.md](../SKILL.md)

# Endpoints reference — service ordering & credit balance

Base URL: `https://rest-api.smsmngr.com/v1`. Auth: `x-api-key` header.

---

## GET /credit — credit balance

No parameters. For shared sub-keys (created with `shared: true`), the shared wallet's balance is
returned.

```json
{
  "success": true,
  "credit": {
    "priceLevels": { "sms_230": 2 },
    "credit_czk": "150.5",
    "credit_eur": "0",
    "billing_id": "1234",
    "vat": "1",
    "currency": "czk",
    "tz": "Europe/Prague"
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `credit_czk` / `credit_eur` | string | Balance as a **numeric string**. |
| `currency` | string | Account currency: `czk` or `eur`. |
| `vat` | string | `"1"` if the account is a VAT payer. |
| `priceLevels` | object | `{platform}_{mcc}` → reached volume-discount bracket (only entries above 0). |
| `billing_id` | string | Billing id of the key. |
| `tz` | string | Account timezone. |

---

## GET /credit/services — service catalog

No parameters. Returns the nested catalog of orderable paid services:

```json
{
  "success": true,
  "services": {
    "sender": {
      "sms": {
        "420": {
          "alnum": {
            "name": { "cs": "Textový odesílatel", "en": "Text ID sender" },
            "subject": "defined",
            "status": "new",
            "prices": {
              "czk": { "setup": 500, "monthly": 500 },
              "eur": { "setup": 20, "monthly": 20 }
            }
          },
          "simhost": {
            "name": { "cs": "SIM hosting", "en": "SIM hosting" },
            "subject": "defined",
            "prices": {
              "czk": { "setup": 200, "monthly": 100, "min_interval": "year" },
              "eur": { "setup": 8, "monthly": 4, "min_interval": "year" }
            }
          }
        }
      }
    }
  }
}
```

- Structure: `services.sender.{platform}.{calling_code}.{variant}`.
- Flat id for ordering: `sender_{platform}_{calling_code}_{variant}` → `sender_sms_420_alnum`.
- Variant fields: localized `name` (optional `requirements`, `delay`), `subject`
  (`defined` = you supply it, `assigned` = pooled number allocated), optional default `status`,
  `prices` per currency with `setup`, `monthly`, optional `min_interval` (`month`/`year`) or
  `min_monthly_spend`.

---

## POST /credit/order — order a paid service

| Body field | Required | Notes |
|------------|----------|-------|
| `service_id` | yes | Flat id from the catalog, e.g. `sender_sms_420_alnum`. |
| `period` | yes | Requested billing period (e.g. `month`). The effective period is the service's minimal interval. |
| `subject` | for `defined` services | The sender text or phone number to register. |
| `payload` | no | Optional extra data stored with the order. |
| `dryrun` | no | `true` = validate only (credit, availability) and return the fee — **no charge, no changes**. |

Total fee = `setup + monthly × months` (months: `year` = 12, `quarter` = 3, otherwise 1), deducted
from credit.

Responses (`200`):

```json
{ "success": true, "order": { "subject": "Mojefirma", "subject_id": "Mojefirma", "status": "new" } }
```

```json
{ "success": true, "order": { "dryrun": true, "total_fee": 1000, "currency": "czk", "subject": null, "service_id": "sender_sms_420_alnum" } }
```

- `order.subject` — for `assigned` services this is the **allocated number**.
- `order.status` — `new` (processing/approval pending) or `active`.
- `400` — missing required fields. `500` with `message` — `Invalid service id`,
  `Insufficient credit`, `No available sender for this service`.

---

## POST /credit/cancel — cancel a paid service

| Body field | Required | Notes |
|------------|----------|-------|
| `service_id` | yes | Flat id from the catalog. |
| `subject` | yes | The **exact** subject the service was ordered with. |

Flags the service for cancellation at the end of its paid period — no immediate charge or refund;
idempotent.

```json
{ "success": true, "cancel": { "cancel_at_period_end": true, "active_until": "2026-08-15" } }
```

- `500` with `message` — `Service not found`, `Service already cancelled`.

## Links

- Developer docs / API reference: https://smsmanager.com/docs
- Using an ordered sender in sends: see smsmanager-messaging-api
