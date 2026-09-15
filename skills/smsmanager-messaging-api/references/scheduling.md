← [Back to smsmanager-messaging-api SKILL.md](../SKILL.md)

# Scheduling messages

Two independent mechanisms control *when* a message goes out. They can be combined.

## `datetime` — exact send time (UTC)

Schedule a message for a specific moment. Always interpreted as **UTC**.

```json
{
  "body": "Připomínka schůzky v 11:00",
  "to": [{ "phone_number": "420777123456" }],
  "datetime": "2025-01-11T10:00:00Z"
}
```

- Format: ISO 8601 with a `Z` suffix (`2025-01-11T10:00:00Z`).
- Convert local time to UTC yourself. For example, 11:00 in `Europe/Prague` (CET, UTC+1) is
  `10:00:00Z`.
- Omit `datetime` to send immediately.
- A scheduled message can be **cancelled before it is sent** via REST `POST /messaging/cancel` with
  its `message_id` — see the smsmanager-bulk-messaging skill.

## `delivery_time` — allowed delivery window

Constrain delivery to certain days and hours, in a named timezone. Useful for respecting quiet hours
or business hours regardless of when you submit the request.

| Field | Type | Notes |
|-------|------|-------|
| `days` | string[] | Allowed weekdays: `monday`…`sunday`. |
| `start` | string | Window start time, e.g. `08:00`. |
| `end` | string | Window end time, e.g. `21:00`. |
| `tz` | string | IANA timezone, e.g. `Europe/Prague`. Default `UTC`. |

```json
{
  "body": "Vaše objednávka je připravena k vyzvednutí.",
  "to": [{ "phone_number": "420777123456" }],
  "delivery_time": {
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "start": "08:00",
    "end": "21:00",
    "tz": "Europe/Prague"
  }
}
```

If the message would otherwise be sent outside the window, delivery is held until the next allowed
slot.

## Combining both

You can set a `datetime` *and* a `delivery_time`: the message is scheduled for the `datetime`, but
only actually delivered if that moment falls inside the `delivery_time` window (otherwise it waits for
the next allowed slot).

## Gotchas

- `datetime` is **UTC only** — a common bug is passing local time without converting.
- `delivery_time.tz` accepts IANA names (`Europe/Prague`, `Europe/Berlin`, `America/New_York`), not
  offsets like `+01:00`.
- Quiet-hours/consent rules differ by country (GDPR and local marketing law) — use `delivery_time` to
  avoid sending marketing messages at night.
