# Authoring guide for SmsManager Skills

This repository contains **Agent Skills** for SmsManager's APIs (JSON API v2 for sending, REST API
v1 for status/inbox). Each skill teaches an AI coding agent how to use one part of the API
correctly. Follow these rules when creating or editing a
skill. They keep the catalog consistent and safe.

## What a skill is

A skill is a folder under `skills/` named `smsmanager-<product-slug>` containing:

- `SKILL.md` — **required.** YAML frontmatter + Markdown body. The entry point the agent reads first.
- `references/` — optional. Detailed docs loaded **on demand** when `SKILL.md` links to them.
- `scripts/` — optional. Runnable, zero-dependency Node `.cjs` helpers the agent can execute.
- `assets/` — optional. Sample code or files the agent reads and adapts.

## Frontmatter schema

```yaml
---
name: smsmanager-messaging-api        # = folder name; kebab-case; max 64 chars; "smsmanager-<slug>"
description: "<what it does> Use when <intents>. Do NOT use for <X> (see smsmanager-<other>)."  # max 1024 chars
metadata:
  author: SmsManager
  version: 1.0.0                       # per-skill semver, independent of tile.json version
  category: Core | Messaging | Numbers | Account
  tags: comma, separated, keywords    # a STRING, not a YAML list
  uses:                               # other skills this one depends on (optional)
    - smsmanager-authentication
---
```

- `name` and `description` are the only **required** fields.
- The `description` is the most important field — it decides whether the model triggers the skill.
  Write it as: verb-first statement of what it does, then `Use when …` with concrete user intents,
  optionally `Also use when …` (failure symptoms), `Do NOT use for …`, and cross-references to
  sibling skills.
- **No `<` or `>` angle brackets** anywhere in the frontmatter.

## Body structure (keep this section order)

1. `# <Product> Overview` — 2–3 sentences: what it does + when to use it.
2. `## Agent Instructions` — what to ask the user before writing code (language? curl or SDK?).
3. `## Getting Started` — credentials via env vars + the first API call (curl + one language).
4. `## Key Concepts` — domain model and terminology.
5. `## Common Patterns` — frequent use cases with code.
6. `## Gotchas and Best Practices` — non-obvious pitfalls (encoding, scheduling, rate limits).
7. `## Security` — API-key handling, URL allowlist, untrusted inbound content.
8. `## Links` — docs, OpenAPI spec, dashboard.

## Hard rules — do NOT

- Do not exceed **500 lines** in a `SKILL.md`. Move detail into `references/`.
- Do not put real credentials or API keys in examples. Use placeholders (`YOUR_API_KEY`,
  `420777123456`).
- Do not use `<` `>` in YAML frontmatter.
- Do not add `README.md` or `CHANGELOG.md` inside a skill folder — only `SKILL.md` + resources.
- Do not invent API fields. Ground everything in the official API reference at
  `https://smsmanager.com/docs` (source OpenAPI specs live in the internal `smsc` repo under
  `openapi/`).

## Conventions

- **Base URLs:** `https://api.smsmngr.com/v2` (JSON API v2, sending) and
  `https://rest-api.smsmngr.com/v1` (REST API v1, status/inbox).
- **Auth:** `x-api-key: YOUR_API_KEY` header (recommended) or `apikey` query parameter (simple GET).
- **Credentials** always come from environment variables — never hardcode. Single naming scheme:
  - `SMSMANAGER_API_KEY` (required)
  - `SMSMANAGER_BASE_URL` (optional, default `https://api.smsmngr.com/v2`)
  - `SMSMANAGER_REST_BASE_URL` (optional, default `https://rest-api.smsmngr.com/v1`)
  - `SMSMANAGER_SENDER` (optional, default sender ID)
- **Phone numbers:** international E.164 format **without** a leading `+` or `00`, e.g. `420777123456`.
- Code examples in **curl** plus at least one of Node.js / PHP / Python (PHP is common in our market).
- Scripts: Node `.cjs`, zero external dependencies (only Node built-ins), shared auth/HTTP factored
  into `scripts/common/smsmanager_client.cjs`.
- Reference files start with a back-link: `← [Back to <skill> SKILL.md](../SKILL.md)`.
