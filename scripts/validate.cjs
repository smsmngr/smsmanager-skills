#!/usr/bin/env node
/**
 * Catalog validation — run from the repo root: node scripts/validate.cjs
 *
 * Checks:
 *  - tile.json, .claude-plugin/plugin.json and .claude-plugin/marketplace.json parse as JSON
 *  - every skill listed in tile.json exists on disk, and every skills/<dir> is listed in tile.json
 *  - each SKILL.md: has YAML frontmatter; frontmatter `name` matches the folder name;
 *    `description` present and 1024 chars or less; no angle brackets in frontmatter;
 *    file is 500 lines or less
 */

"use strict";

var fs = require("fs");
var path = require("path");

var errors = [];

function fail(msg) {
  errors.push(msg);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail(file + ": " + e.message);
    return null;
  }
}

var tile = readJson("tile.json");
readJson(".claude-plugin/plugin.json");
readJson(".claude-plugin/marketplace.json");

var tileSkills = tile && tile.skills ? tile.skills : {};
for (var name in tileSkills) {
  if (!fs.existsSync(tileSkills[name].path)) {
    fail("tile.json: missing path for " + name + ": " + tileSkills[name].path);
  }
}

var skillDirs = fs
  .readdirSync("skills", { withFileTypes: true })
  .filter(function (d) {
    return d.isDirectory();
  })
  .map(function (d) {
    return d.name;
  });

skillDirs.forEach(function (dir) {
  if (!tileSkills[dir]) fail("skills/" + dir + " is not listed in tile.json");

  var skillFile = path.join("skills", dir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(skillFile + " does not exist");
    return;
  }

  var content = fs.readFileSync(skillFile, "utf8");
  var lines = content.split("\n");

  if (lines.length > 500) {
    fail(skillFile + " has " + lines.length + " lines (max 500)");
  }

  if (lines[0] !== "---") {
    fail(skillFile + ": missing YAML frontmatter");
    return;
  }
  var end = lines.indexOf("---", 1);
  if (end === -1) {
    fail(skillFile + ": unterminated YAML frontmatter");
    return;
  }
  var frontmatter = lines.slice(1, end).join("\n");

  if (/[<>]/.test(frontmatter)) {
    fail(skillFile + ": frontmatter contains angle brackets");
  }

  var nameMatch = frontmatter.match(/^name:\s*(\S+)\s*$/m);
  if (!nameMatch) {
    fail(skillFile + ": frontmatter has no name");
  } else if (nameMatch[1] !== dir) {
    fail(skillFile + ": frontmatter name '" + nameMatch[1] + "' != folder '" + dir + "'");
  }

  var descMatch = frontmatter.match(/^description:\s*"([^"]*)"\s*$/m);
  if (!descMatch) {
    fail(skillFile + ": frontmatter has no quoted description");
  } else if (descMatch[1].length > 1024) {
    fail(skillFile + ": description is " + descMatch[1].length + " chars (max 1024)");
  }
});

if (errors.length > 0) {
  errors.forEach(function (e) {
    process.stderr.write("FAIL: " + e + "\n");
  });
  process.exit(1);
}

process.stdout.write(
  "OK — " + skillDirs.length + " skills, manifests valid (tile.json, plugin.json, marketplace.json)\n"
);
