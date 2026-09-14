← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# Python examples

No SDK required — plain JSON over HTTPS with `requests`. The API key comes from `SMSMANAGER_API_KEY`.

## Send one SMS

```python
import os
import requests

BASE_URL = os.environ.get("SMSMANAGER_BASE_URL", "https://api.smsmngr.com/v2")
HEADERS = {
    "x-api-key": os.environ["SMSMANAGER_API_KEY"],
    "Content-Type": "application/json",
}


def send_sms(phone_number: str, body: str, sender: str | None = None) -> dict:
    message = {"body": body, "to": [{"phone_number": phone_number}]}
    if sender:
        message["flow"] = [{"sms": {"sender": sender}}]

    resp = requests.post(f"{BASE_URL}/message", json=message, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.json()  # {"request_id": ..., "accepted": [...], "rejected": [...]}


result = send_sms("420777123456", "Ahoj!", "MojeFirma")
print(result["request_id"], result["accepted"])
```

## Batch send with a custom payload

```python
batch = [
    {
        "body": "Objednávka odeslána",
        "to": [{"phone_number": "420777123456"}],
        "tag": "transactional",
        "callback": "https://example.com/delivery",
        "payload": {"order_id": "ORD-1001"},
    },
    {
        "body": "Objednávka odeslána",
        "to": [{"phone_number": "420777654321"}],
        "tag": "transactional",
        "payload": {"order_id": "ORD-1002"},
    },
]

resp = requests.post(f"{BASE_URL}/messages", json=batch, headers=HEADERS, timeout=15)
resp.raise_for_status()
data = resp.json()  # "key" in accepted/rejected = index in the batch list
```

## Gotchas

- `requests`' `json=` argument sends UTF-8 — keep `type: "utf"` in the flow to preserve diacritics.
- `raise_for_status()` catches HTTP errors, but still inspect `rejected` for per-recipient problems.
