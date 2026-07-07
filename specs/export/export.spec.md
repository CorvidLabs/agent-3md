---
module: export
version: 1
status: draft
files:
  - src/export.ts

db_tables: []
depends_on: []
---

# Export

## Purpose

`export` projects an `agent.3md` into a portable, self-describing JSON manifest
so a consumer in any language or runtime can query the agent's skills without a
3md parser. It loads the file through the runtime `Agent`, walks the skill
catalog, and prints a single JSON document tagged with the `agent3md/1` schema.
By default the output is the catalog only (no skill instructions); with
`--bodies` it also carries each skill's full body for complete hydration. It is
an executable script driven by command-line arguments, not a library.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| (none) | Executable script; the contract is the JSON document it prints to stdout. |

### Structs & Enums

| Type | Description |
|------|-------------|
| (none) | Uses `Agent` from the runtime; declares no exported types. The output shape is documented below. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | Command-line entry point: `bun run src/export.ts <file.3md> [--bodies]`. |

### Functions

| Output field | Shape | Description |
|--------------|-------|-------------|
| `schema` | `"agent3md/1"` | The manifest schema tag. |
| `agent` | `{ name, model, tools, persona }` | The agent identity from the manifest. |
| `skills` | array | Per skill: `name`, `z`, `triggers`, `inputs`, `inputSchema`, `tool`, `cost`, `deps`. |
| `bodies` | `{ [name]: string }` | Present only with `--bodies`: each skill's full body keyed by name. |

## Invariants

1. The file argument is the first non-flag argument; when it is omitted the packaged `../agent.3md` is used.
2. The output is a single pretty-printed JSON object, indented by two spaces, always tagged `schema: "agent3md/1"`.
3. The `agent` block carries the manifest identity: `name`, `model`, `tools`, and `persona`.
4. Every skill in the manifest catalog appears in `skills`, in catalog order, with its full typed metadata (`inputs`, `inputSchema`, `tool`, `cost`, `deps`) but not its body.
5. The heavy `bodies` map is emitted only when `--bodies` is passed; without it the manifest is the catalog alone, so a consumer can hydrate a body on demand later.

## Behavioral Examples

```
Given a valid agent.3md with a "search" skill
When export runs without --bodies
Then the JSON has schema "agent3md/1", an agent block, and a skills entry for search with no body text
```

```
Given the same file
When export runs with --bodies
Then the JSON additionally carries a bodies map whose "search" key is that skill's full body
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| read failure | the target file cannot be read | The underlying `readFileSync` throws and the script exits with that error. |
| parse error | the file is not valid 3md | The `Agent` constructor propagates the parser's `ParseError`. |

## Dependencies

- `./runtime` - `Agent` (`manifest` and `get`) supplies the catalog and each skill's full record.
- `node:fs` - reads the source file.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the portable JSON manifest exporter. |
</content>
