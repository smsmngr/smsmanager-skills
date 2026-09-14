# Changelog

All notable changes to this skills catalog are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/). Individual skills have their own versions in their
`SKILL.md` metadata.

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
