# AGENTS.md

Short contributor rules for this skills catalog. The full authoring guide is in
[CLAUDE.md](CLAUDE.md).

## Layout

- One folder per product under `skills/`, named `smsmanager-<product-slug>` (kebab-case).
- The skill file is exactly `SKILL.md` (case-sensitive).
- Optional bundled resources: `references/` (on-demand docs), `scripts/` (runnable `.cjs`),
  `assets/` (sample files).

## SKILL.md rules

- Required frontmatter: `name` (≤ 64 chars, matches the folder) and `description` (≤ 1024 chars).
- No `<` or `>` characters in frontmatter.
- Keep the file under 500 lines; push detail into `references/`.
- No real API keys — placeholders only.
- Don't add `README.md` / `CHANGELOG.md` inside a skill folder.

## Ground truth

All API facts must match the OpenAPI spec:
`https://api-ref.smsmanager.com/_bundle/openapi/cs/json/jsonapi_v2.json`

Base URL `https://api.smsmngr.com/v2`, auth header `x-api-key`, phone numbers in E.164 without a
leading `+`.
