/**
 * Shared SmsManager REST API v1 client utilities.
 *
 * Provides environment-variable helpers, a JSON request helper and a raw presigned-URL PUT helper
 * used by the bulk scripts. Zero dependencies — uses only Node built-ins. Credentials are read
 * from the environment and are never logged.
 *
 * Environment variables:
 *   SMSMANAGER_API_KEY        (required) — your API key
 *   SMSMANAGER_REST_BASE_URL  (optional) — default https://rest-api.smsmngr.com/v1
 */

"use strict";

var https = require("https");
var { URL } = require("url");

var DEFAULT_BASE_URL = "https://rest-api.smsmngr.com/v1";

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
  return process.env.SMSMANAGER_REST_BASE_URL || DEFAULT_BASE_URL;
}

/**
 * Make a JSON HTTPS request to the SmsManager REST API.
 * @param {string} method - HTTP method (e.g. "POST").
 * @param {string} path   - Path relative to the base URL (e.g. "/messaging/url").
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

/**
 * PUT a raw buffer to a presigned URL (storage upload — no API key involved).
 * @param {string} presignedUrl - The presigned PUT URL from POST /messaging/url.
 * @param {Buffer} data         - File contents.
 * @param {string} contentType  - "application/jsonl" or "application/gzip".
 * @returns {Promise<{status:number, body:string}>}
 */
function putToUrl(presignedUrl, data, contentType) {
  var url = new URL(presignedUrl);

  var options = {
    method: "PUT",
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      "Content-Type": contentType,
      "Content-Length": data.length,
    },
  };

  return new Promise(function (resolve, reject) {
    var req = https.request(options, function (res) {
      var chunks = "";
      res.on("data", function (d) {
        chunks += d;
      });
      res.on("end", function () {
        resolve({ status: res.statusCode, body: chunks });
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

module.exports = { getEnv: getEnv, baseUrl: baseUrl, apiRequest: apiRequest, putToUrl: putToUrl };
