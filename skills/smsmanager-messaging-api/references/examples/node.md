← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# Node.js examples

No SDK required — the API is plain JSON over HTTPS. These use the built-in `fetch` (Node 18+). The
API key comes from `SMSMANAGER_API_KEY`.

## Send one SMS

```js
const BASE_URL = process.env.SMSMANAGER_BASE_URL || "https://api.smsmngr.com/v2";

async function sendSms(phoneNumber, body, sender) {
  const res = await fetch(`${BASE_URL}/message`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.SMSMANAGER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body,
      to: [{ phone_number: phoneNumber }],
      flow: sender ? [{ sms: { sender } }] : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`SmsManager error ${res.status}: ${await res.text()}`);
  }
  return res.json(); // { request_id, accepted: [...], rejected: [...] }
}

const result = await sendSms("420777123456", "Ahoj!", "MojeFirma");
console.log(result.request_id, result.accepted);
```

## Omnichannel: Viber with SMS fallback

```js
const payload = {
  body: "Sleva 20 % jen dnes!",
  to: [{ phone_number: "420777123456" }],
  flow: [
    { viber: { sender: "MojeFirma", ttl: 2 } },
    { sms: { sender: "MojeFirma", type: "utf" } },
  ],
};

await fetch(`${BASE_URL}/message`, {
  method: "POST",
  headers: { "x-api-key": process.env.SMSMANAGER_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

## Batch: many different messages

```js
const batch = [
  { body: "Hello John", to: [{ phone_number: "420777123456" }] },
  { body: "Hello Jane", to: [{ phone_number: "420777654321" }] },
];

const res = await fetch(`${BASE_URL}/messages`, {
  method: "POST",
  headers: { "x-api-key": process.env.SMSMANAGER_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify(batch),
});
const { accepted, rejected } = await res.json(); // key = index in the batch array
```

> A ready-to-run version is in [`scripts/send_sms.cjs`](../../scripts/send_sms.cjs).
