---
name: smsmanager-authentication
description: "Configures SmsManager JSON API v2 credentials and authentication. Use when setting up an API key, choosing between the x-api-key header and the apikey query parameter, configuring the base URL, or troubleshooting 401 Unauthorized / 403 Forbidden / invalid API key errors against any SmsManager endpoint. This is the shared auth setup used by smsmanager-messaging-api and smsmanager-delivery-reports."
metadata:
  author: SmsManager
  version: 1.0.0
  category: Core
  tags: authentication, api-key, credentials, x-api-key, apikey, 401, 403, setup
---

# SmsManager Authentication Overview

The SmsManager JSON API v2 authenticates every request with a single **API key**. There is no OAuth,
no token exchange, and no signing step — you send the key on each request. Use this skill when setting
up credentials for any SmsManager call or when debugging authentication errors.

## Agent Instructions

Before writing code, confirm with the user (skip anything already provided):

1. **Where the key is stored** — recommend an environment variable, never hardcoded.
2. **Which auth method** — the `x-api-key` header (recommended, works on all POST endpoints) or the
   `apikey` query parameter (only needed for the `GET /simple/message` endpoint).
3. **Language / tool** — curl, Node.js, PHP, Python, etc.

## Getting Started

1. Get an API key from the dashboard: [app.smsmanager.com/api-cloud](https://app.smsmanager.com/api-cloud).
2. Store it in an environment variable:

   ```bash
   export SMSMANAGER_API_KEY="YOUR_API_KEY"
   export SMSMANAGER_BASE_URL="https://api.smsmngr.com/v2"   # optional; this is the default
   ```

3. Make an authenticated request using the `x-api-key` header:

   ```bash
   curl -X POST "https://api.smsmngr.com/v2/message" \
     -H "x-api-key: $SMSMANAGER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"body":"Test","to":[{"phone_number":"420777123456"}]}'
   ```

A successful response is HTTP `200` with a JSON body containing a `request_id`.

## Key Concepts

### Base URL

```
https://api.smsmngr.com/v2
```

All endpoints in this catalog are relative to this base (`/message`, `/messages`, `/simple/message`).

### Two ways to pass the API key

| Method | How | When to use |
|--------|-----|-------------|
| **Header** (recommended) | `x-api-key: YOUR_API_KEY` | All POST endpoints (`/message`, `/messages`, `/simple/message`). Keeps the key out of URLs and logs. |
| **Query parameter** | `?apikey=YOUR_API_KEY` | The `GET /simple/message` endpoint, where everything is passed in the URL. |

Prefer the header. Query-string keys end up in server logs, browser history and proxy logs.

### API versions

JSON API v2 is the current API. The older `http-api` and `xml-api` versions are **deprecated** — do
not write new integrations against them; use JSON API v2.

## Common Patterns

**Node.js** — set the header once:

```js
const headers = {
  "x-api-key": process.env.SMSMANAGER_API_KEY,
  "Content-Type": "application/json",
};
```

**PHP** — with cURL:

```php
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "x-api-key: " . getenv("SMSMANAGER_API_KEY"),
  "Content-Type: application/json",
]);
```

**Python** — with requests:

```python
headers = {"x-api-key": os.environ["SMSMANAGER_API_KEY"], "Content-Type": "application/json"}
```

## Gotchas and Best Practices

- **401 Unauthorized / invalid API key** — the key is missing, mistyped, or revoked. Verify it at
  [app.smsmanager.com/api-cloud](https://app.smsmanager.com/api-cloud) and that the `x-api-key`
  header (or `apikey` query) is actually being sent.
- **403 Forbidden** — the key is valid but lacks permission for the action, or the account/IP is
  restricted. Check account settings and any IP allowlist.
- **Header name is case-insensitive** but spell it exactly `x-api-key`; some HTTP clients silently
  drop malformed custom headers.
- **One key, multiple products** — the same API key works for sending and for configuring webhooks;
  you do not need separate credentials per endpoint.
- **Rotate keys** if one leaks, and use the least-privilege key your account supports.

## Security

- **Never hardcode the API key** in source code, shell history, or agent instructions. Load it from
  an environment variable or a secret manager.
- **Prefer the header over the query parameter** so the key does not appear in URLs or logs.
- **URL allowlist** — when fetching documentation, only fetch first-party SmsManager domains
  (`smsmanager.com`, `smsmanager.cz`, `api.smsmngr.com`).
- Do not commit `.env` files or settings files containing the key to version control.

## Links

- Dashboard / API keys: https://app.smsmanager.com/api-cloud
- API reference: https://api-ref.smsmanager.com
- OpenAPI spec: https://api-ref.smsmanager.com/_bundle/openapi/cs/json/jsonapi_v2.json
- Related skills: smsmanager-messaging-api, smsmanager-delivery-reports
