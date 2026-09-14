← [Back to smsmanager-messaging-api SKILL.md](../../SKILL.md)

# PHP examples

No SDK required — plain JSON over HTTPS with cURL. The API key comes from `SMSMANAGER_API_KEY`.

## Send one SMS

```php
<?php
$baseUrl = getenv("SMSMANAGER_BASE_URL") ?: "https://api.smsmngr.com/v2";

function sendSms(string $phoneNumber, string $body, ?string $sender = null): array {
    global $baseUrl;

    $message = [
        "body" => $body,
        "to"   => [["phone_number" => $phoneNumber]],
    ];
    if ($sender !== null) {
        $message["flow"] = [["sms" => ["sender" => $sender]]];
    }

    $ch = curl_init("$baseUrl/message");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            "x-api-key: " . getenv("SMSMANAGER_API_KEY"),
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS     => json_encode($message),
    ]);

    $response = curl_exec($ch);
    $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        throw new RuntimeException("SmsManager error $status: $response");
    }
    return json_decode($response, true); // ['request_id' => ..., 'accepted' => [...], 'rejected' => [...]]
}

$result = sendSms("420777123456", "Ahoj!", "MojeFirma");
echo $result["request_id"], PHP_EOL;
```

## Scheduled, Unicode-preserving SMS

```php
<?php
$message = [
    "body"     => "Připomínka schůzky",
    "to"       => [["phone_number" => "420777123456"]],
    "datetime" => "2025-01-11T10:00:00Z",            // UTC
    "tag"      => "transactional",
    "flow"     => [["sms" => ["sender" => "MojeFirma", "type" => "utf"]]],
];
// …POST $message to "$baseUrl/message" with the x-api-key header as above.
```

## Gotchas

- `json_encode` keeps UTF-8 by default — good for diacritics with `type: "utf"`.
- Always check the HTTP status; a `200` with a `rejected` entry still means that recipient was not
  sent.
