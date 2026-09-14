#!/usr/bin/env node
/**
 * Get the status of a sent message via the SmsManager REST API v1 (GET /message).
 *
 * Usage:
 *   node get_message_status.cjs --id e27ff0ac-87b5-4e1d-b644-5fc6029e2a11
 *
 * Flags:
 *   --id     The message_id from the send response or webhook. Required.
 *            For POST /messages sends, append -<recipient_index> for the per-recipient id.
 *   --help   Show this help.
 *
 * Environment variables:
 *   SMSMANAGER_API_KEY        (required)
 *   SMSMANAGER_REST_BASE_URL  (optional, default https://rest-api.smsmngr.com/v1)
 */

"use strict";

var client = require("./common/smsmanager_rest_client.cjs");

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
  process.stderr.write("Usage: node get_message_status.cjs --id <message_id>\n");
  process.exit(code);
}

async function main() {
  var args = parseArgs(process.argv.slice(2));

  if (args.help) usageAndExit(0);
  if (!args.id || args.id === true) {
    process.stderr.write("Error: --id is required.\n");
    usageAndExit(1);
  }

  var res = await client.apiGet("/message", { id: String(args.id) });

  // Print the API response as JSON to stdout for further processing.
  process.stdout.write(JSON.stringify(res.body, null, 2) + "\n");

  if (res.status !== 200) {
    process.stderr.write("Request failed with HTTP " + res.status + ".\n");
    process.exit(1);
  }

  if (res.body && res.body.success === true && res.body.message === null) {
    process.stderr.write("Message not found (or not owned by this API key).\n");
    process.exit(1);
  }
}

main().catch(function (err) {
  process.stderr.write("Error: " + err.message + "\n");
  process.exit(1);
});
