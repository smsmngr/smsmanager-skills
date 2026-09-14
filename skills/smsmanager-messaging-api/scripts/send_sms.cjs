#!/usr/bin/env node
/**
 * Send an SMS via the SmsManager JSON API v2 (POST /message).
 *
 * Usage:
 *   node send_sms.cjs --to 420777123456 --message "Ahoj!"
 *   node send_sms.cjs --to 420777123456 --message "Vas kod: 1234" --sender MojeFirma --type sms
 *   node send_sms.cjs --to 420777123456,420777654321 --message "Hi" --tag transactional
 *
 * Flags:
 *   --to        Comma-separated recipient numbers, E.164 without leading "+" (max 10). Required.
 *   --message   Message body (max 1000 chars). Required.
 *   --sender    Sender ID (alphanumeric max 11 chars, or virtual number). Optional.
 *   --type      "utf" (default, keeps Unicode) or "sms" (strips Unicode for GSM-7 capacity).
 *   --gateway   "high" (default), "lowcost", "direct" (virtual number), "custom"/"simhost" (SIM hosting), or "gsm" (own GSM gateway).
 *   --tag       Message tag (default "promotional"; special: "priority", "transactional").
 *   --help      Show this help.
 *
 * Environment variables:
 *   SMSMANAGER_API_KEY   (required)
 *   SMSMANAGER_BASE_URL  (optional, default https://api.smsmngr.com/v2)
 *   SMSMANAGER_SENDER    (optional, used if --sender is omitted)
 */

"use strict";

var client = require("./common/smsmanager_client.cjs");

function parseArgs(argv) {
  var args = {};
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (a.indexOf("--") === 0) {
      var key = a.slice(2);
      var next = argv[i + 1];
      if (next === undefined || next.indexOf("--") === 0) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function usageAndExit(code) {
  process.stderr.write(
    "Usage: node send_sms.cjs --to <number[,number...]> --message <text> " +
      "[--sender <id>] [--type utf|sms] [--gateway high|lowcost|direct|custom|simhost|gsm] [--tag <tag>]\n"
  );
  process.exit(code);
}

async function main() {
  var args = parseArgs(process.argv.slice(2));

  if (args.help) usageAndExit(0);
  if (!args.to || !args.message) {
    process.stderr.write("Error: --to and --message are required.\n");
    usageAndExit(1);
  }

  var recipients = String(args.to)
    .split(",")
    .map(function (n) {
      return n.trim();
    })
    .filter(Boolean)
    .map(function (n) {
      return { phone_number: n };
    });

  if (recipients.length === 0) usageAndExit(1);
  if (recipients.length > 10) {
    process.stderr.write("Error: at most 10 recipients per /message request.\n");
    process.exit(1);
  }

  var sender = args.sender || process.env.SMSMANAGER_SENDER;

  var message = { body: String(args.message), to: recipients };
  if (args.tag) message.tag = String(args.tag);

  // Build an SMS flow entry only if we have channel-specific options to set.
  var sms = {};
  if (sender) sms.sender = String(sender);
  if (args.type) sms.type = String(args.type);
  if (args.gateway) sms.gateway = String(args.gateway);
  if (Object.keys(sms).length > 0) {
    message.flow = [{ sms: sms }];
  }

  process.stderr.write(
    "Sending to " + recipients.length + " recipient(s)" + (sender ? " from " + sender : "") + "...\n"
  );

  var res = await client.apiRequest("POST", "/message", message);

  // Print the API response as JSON to stdout for further processing.
  process.stdout.write(JSON.stringify(res.body, null, 2) + "\n");

  if (res.status !== 200) {
    process.stderr.write("Request failed with HTTP " + res.status + ".\n");
    process.exit(1);
  }

  if (res.body && Array.isArray(res.body.rejected) && res.body.rejected.length > 0) {
    process.stderr.write(
      "Warning: " + res.body.rejected.length + " recipient(s) rejected (not sent).\n"
    );
  }
}

main().catch(function (err) {
  process.stderr.write("Error: " + err.message + "\n");
  process.exit(1);
});
