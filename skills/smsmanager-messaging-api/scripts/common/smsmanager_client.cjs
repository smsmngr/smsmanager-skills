/**
 * Shared SmsManager JSON API v2 client utilities.
 *
 * Provides environment-variable helpers and an HTTPS request helper used by the send_*.cjs scripts.
 * Zero dependencies — uses only Node built-ins. Credentials are read from the environment and are
 * never logged.
 *
 * Environment variables:
 *   SMSMANAGER_API_KEY   (required) — your API key
 *   SMSMANAGER_BASE_URL  (optional) — default https://api.smsmngr.com/v2
 *   SMSMANAGER_SENDER    (optional) — default sender ID
 */

"use strict";

var https = require("https");
var { URL } = require("url");

var DEFAULT_BASE_URL = "https://api.smsmngr.com/v2";

/** Read an environment variable; exit with a clear message if a required one is missing. */
function getEnv(name, required) {
  var value = process.env[name];
  if ((value === undefined || value === "") && required) {
    process.stderr.write("Missing required environment variable: " + name + "\n");
    process.exit(1);
  }
  return value;
}

function baseUrl() {
  return process.env.SMSMANAGER_BASE_URL || DEFAULT_BASE_URL;
}

/**
 * Make a JSON HTTPS request to the SmsManager API.
 * @param {string} method - HTTP method (e.g. "POST").
 * @param {string} path   - Path relative to the base URL (e.g. "/message").
 * @param {object} [body] - JSON body to send.
 * @returns {Promise<{status:number, body:any}>}
 */
function apiRequest(method, path, body) {
  var apiKey = getEnv("SMSMANAGER_API_KEY", true);
  var url = new URL(baseUrl() + path);
  var payload = body ? JSON.stringify(body) : null;

  var options = {
    method: method,
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (payload) {
    options.headers["Content-Length"] = Buffer.byteLength(payload);
  }

  return new Promise(function (resolve, reject) {
    var req = https.request(options, function (res) {
      var chunks = "";
      res.on("data", function (d) {
        chunks += d;
      });
      res.on("end", function () {
        var parsed;
        try {
          parsed = chunks ? JSON.parse(chunks) : null;
        } catch (e) {
          parsed = chunks; // non-JSON error body
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = { getEnv: getEnv, baseUrl: baseUrl, apiRequest: apiRequest };
