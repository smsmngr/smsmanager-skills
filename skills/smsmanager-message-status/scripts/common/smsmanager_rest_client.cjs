/**
 * Shared SmsManager REST API v1 client utilities.
 *
 * Provides environment-variable helpers and an HTTPS request helper used by the get_*.cjs scripts.
 * Zero dependencies — uses only Node built-ins. Credentials are read from the environment and are
 * never logged.
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
 * Make a JSON HTTPS GET request to the SmsManager REST API.
 * @param {string} path    - Path relative to the base URL (e.g. "/message").
 * @param {object} [query] - Query parameters as key/value pairs.
 * @returns {Promise<{status:number, body:any}>}
 */
function apiGet(path, query) {
  var apiKey = getEnv("SMSMANAGER_API_KEY", true);
  var url = new URL(baseUrl() + path);
  if (query) {
    Object.keys(query).forEach(function (key) {
      if (query[key] !== undefined && query[key] !== null) {
        url.searchParams.set(key, String(query[key]));
      }
    });
  }

  var options = {
    method: "GET",
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  };

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
    req.end();
  });
}

module.exports = { getEnv: getEnv, baseUrl: baseUrl, apiGet: apiGet };
