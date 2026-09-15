#!/usr/bin/env node
/**
 * Upload a bulk JSONL file via the SmsManager REST API v1
 * (POST /messaging/url + presigned PUT).
 *
 * Usage:
 *   node upload_bulk.cjs --file messages.jsonl --bulk-id campaign-42
 *   node upload_bulk.cjs --file messages.jsonl.gz --bulk-id promo --datetime 2026-09-16T08:00:00Z
 *
 * Flags:
 *   --file      Path to the bulk file. ".gz" uploads as gzip, anything else as plain JSONL. Required.
 *   --bulk-id   Your identifier of the bulk upload (needed to cancel a scheduled bulk). Required.
 *   --datetime  Optional scheduled processing time, UTC ISO 8601.
 *   --help      Show this help.
 *
 * The file must contain one JSON API v2 Message object per line (see the
 * smsmanager-messaging-api skill for the Message schema).
 *
 * Environment variables:
 *   SMSMANAGER_API_KEY        (required)
 *   SMSMANAGER_REST_BASE_URL  (optional, default https://rest-api.smsmngr.com/v1)
 */

"use strict";

var fs = require("fs");
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
  process.stderr.write(
    "Usage: node upload_bulk.cjs --file <path.jsonl|path.gz> --bulk-id <id> [--datetime <iso-utc>]\n"
  );
  process.exit(code);
}

async function main() {
  var args = parseArgs(process.argv.slice(2));

  if (args.help) usageAndExit(0);
  if (!args.file || args.file === true || !args["bulk-id"] || args["bulk-id"] === true) {
    process.stderr.write("Error: --file and --bulk-id are required.\n");
    usageAndExit(1);
  }

  if (!fs.existsSync(args.file)) {
    process.stderr.write("Error: file not found: " + args.file + "\n");
    process.exit(1);
  }
  var data = fs.readFileSync(args.file);
  if (data.length === 0) {
    process.stderr.write("Error: file is empty: " + args.file + "\n");
    process.exit(1);
  }

  var isGzip = /\.gz$/i.test(String(args.file));
  var filetype = isGzip ? "gz" : "jsonl";
  var contentType = isGzip ? "application/gzip" : "application/jsonl";

  var body = { bulk_id: String(args["bulk-id"]), filetype: filetype };
  if (args.datetime && args.datetime !== true) body.datetime = String(args.datetime);

  // Read the file BEFORE requesting the URL — the presigned URL is valid for only 60 seconds.
  process.stderr.write(
    "Requesting upload URL (bulk_id=" + body.bulk_id + ", filetype=" + filetype +
      (body.datetime ? ", scheduled " + body.datetime : "") + ")...\n"
  );
  var urlRes = await client.apiRequest("POST", "/messaging/url", body);
  if (urlRes.status !== 200 || !urlRes.body || !urlRes.body.url) {
    process.stdout.write(JSON.stringify(urlRes.body, null, 2) + "\n");
    process.stderr.write("Failed to get upload URL (HTTP " + urlRes.status + ").\n");
    process.exit(1);
  }

  process.stderr.write("Uploading " + data.length + " bytes...\n");
  var putRes = await client.putToUrl(urlRes.body.url, data, contentType);
  if (putRes.status < 200 || putRes.status >= 300) {
    process.stderr.write("Upload failed with HTTP " + putRes.status + ".\n");
    if (putRes.body) process.stderr.write(putRes.body.slice(0, 500) + "\n");
    process.exit(1);
  }

  process.stdout.write(
    JSON.stringify({ success: true, bulk_id: body.bulk_id, filetype: filetype, bytes: data.length }, null, 2) + "\n"
  );
}

main().catch(function (err) {
  process.stderr.write("Error: " + err.message + "\n");
  process.exit(1);
});
