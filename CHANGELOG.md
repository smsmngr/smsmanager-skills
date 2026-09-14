# Changelog

All notable changes to this skills catalog are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/). Individual skills have their own versions in their
`SKILL.md` metadata.

## 2026-09-15 — catalog 0.2.0

### Added

- `smsmanager-message-status` v1.0.0 — new skill for the REST API v1 read side: message status
  (`GET /message`), per-date message lists with cursor pagination (`GET /messages`), per-request and
  per-day statistics (`GET /request`, `GET /requests`), and the inbox (`GET /inbox`). Includes an
  endpoints reference and a runnable `get_message_status.cjs` script.
- Claude Code plugin packaging (`.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`) —
  install via `/plugin marketplace add smsmngr/smsmanager-skills`.

### Changed

- `smsmanager-messaging-api` v1.1.0 — root-level `sender`, sender aliases and account
  `default_sender`; `rcs` flow channel (+ new `references/channels/rcs.md`); `POST /message/priority`;
  full `gateway` enum (`high`/`lowcost`/`direct`/`custom`/`simhost`/`gsm`) with automatic resolution
  from the registered sender; `params._url` and `params._incoming`; `/simple/message` optional
  parameters (`gateway`, `datetime`, `customID`).
- `smsmanager-delivery-reports` v1.1.0 — `rcs` gateway value, common rejection-code table
  (`[302]`–`[307]`), per-channel stats objects (`sms`/`viber`/`whatsapp_body`/`whatsapp_template`),
  cross-reference to `smsmanager-message-status`.
- `smsmanager-authentication` v1.1.0 — documents both base URLs (JSON API v2 + REST API v1), new
  `SMSMANAGER_REST_BASE_URL` env var, dashboard URL updated to `app.smsmanager.com/app/developers/`.
- All docs links now point to `smsmanager.com/docs` / `smsmanager.cz/docs`.

## 2026-06-24

### Added

- `smsmanager-authentication` v1.0.0 — initial release. API key handling, base URL, `x-api-key`
  header vs `apikey` query, environment-variable convention, 401/403 troubleshooting.
- `smsmanager-messaging-api` v1.0.0 — initial release. Sending via `/message`, `/messages` and
  `/simple/message`; omnichannel `flow` (SMS, Viber, WhatsApp); sender IDs; Unicode vs GSM (`type`);
  scheduling (`datetime`, `delivery_time`); tags; custom `payload`; batch sends. References for each
  channel, scheduling, endpoints, and Node/PHP/Python examples; runnable send script.
- `smsmanager-delivery-reports` v1.0.0 — initial release. Delivery-status (`sentMessage`),
  inbound-message and inbound-reply webhooks via the per-message `callback` URL; status codes;
  two-way SMS handling.
