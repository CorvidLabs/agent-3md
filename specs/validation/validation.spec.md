---
module: validation
version: 1
status: draft
files:
  - src/validate.ts

db_tables: []
depends_on: [threemd]
---

# Validation

## Purpose

`validation` turns "an agent packaged as a 3md file" from a habit into a
checkable standard: it validates an `agent.3md` against the agent3md/1
conventions. It reuses the canonical 3md parser, then reports each problem
against the offending plane's `z`, splitting findings into hard `error`s (which
fail the document) and advisory `warning`s (which do not). The same rules are
mirrored by the Rust loader's `validate` command, so a document that passes here
passes there. The module doubles as a CLI (`bun run src/validate.ts <file.3md>`)
that prints a report and exits non-zero when any error is found.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| `validateAgent` | `validateAgent(src: string): Report`: parse and check 3md source against agent3md/1, returning a report of errors and warnings. |
| `formatReport` | `formatReport(file: string, r: Report): string`: render a `Report` as a human-readable, multi-line block with a `PASS` / `FAIL` summary. |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Report` | `ok` (true when there are no errors), plus the `errors` and `warnings` arrays. |
| `Issue` | One finding: `level`, `rule` (a stable identifier), `message`, and an optional plane `z`. |
| `IssueLevel` | The string union `"error" \| "warning"`. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | TypeScript module; the contract is `validateAgent` / `formatReport` and the `Report` shape. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `validateAgent` | `validateAgent(src: string): Report` | Parse the source, then run every agent3md/1 rule, collecting errors and warnings by plane. |
| `formatReport` | `formatReport(file: string, r: Report): string` | Format the report as lines prefixed with the failing rule and (when known) `z=`. |

## Invariants

1. Parsing runs first: if the source is not valid 3md, the report is a single `parse` error with `ok: false` and no warnings, and no other rule runs.
2. The agent must be named: a missing `3md` version line or the absence of both `title:` and an `agent:` metadata key is a `frontmatter` error. A `model:` is not required, since the host may override it.
3. The identity plane is the single explicit `kind=identity` plane, or (fallback) the first plane. More than one explicit identity is an `identity` error; a document with no planes at all is an `identity` error. Every non-identity plane is a skill.
4. Each skill must carry a unique, non-empty `label`: a skill with no label is a `missing-label` error, and a repeated label is a `unique-skill` error reported against the later plane.
5. Every `[[z=N]]` link (integer target) must point to an existing plane; a target with no plane is a `dead-link` error against the source plane.
6. An optional `entry:` metadata value must be an integer and must resolve to a real plane, else it is an `entry` error.
7. The dependency graph formed by `[[z=N]]` links (restricted to existing targets) must be acyclic; a cycle is reported once as a `cycle` error naming a plane on the cycle, found by a three-color depth-first search.
8. Skill inputs are parsed with the same grammar as the runtime (`name`, `name:type`, `name:type?`). A repeated input name is a `dup-input` error, and a type outside `{string, number, boolean, object, array}` is an `input-type` error.
9. A `tool=` command binds to the skill's inputs: every `{placeholder}` it references must be a declared input, else it is a `tool-input` error.
10. A document fails (`ok: false`) if and only if there is at least one error; warnings never change `ok`.

## Behavioral Examples

```
Given a skill plane that declares tool="rg {pattern}" but no input named "pattern"
When validateAgent is called
Then the report contains a tool-input error against that skill's z and ok is false
```

```
Given a valid agent.3md where one skill plane has no triggers attribute
When validateAgent is called
Then ok is true and the report contains a triggers warning noting the skill can never be routed to
```

```
Given source that is not valid 3md (for example missing frontmatter)
When validateAgent is called
Then the report is a single parse error, ok is false, and no other rules run
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| `parse` | the source is not valid 3md | Reported as the sole error; validation stops. |
| `frontmatter` | no `3md` version, or neither `title:` nor `agent:` | Recorded as an error (no plane z). |
| `identity` | more than one `kind=identity` plane, or a document with no planes | Recorded as an error. |
| `missing-label` / `unique-skill` | a skill has no label, or two skills share a label | Recorded as an error against the offending skill. |
| `dead-link` / `cycle` / `entry` | a link targets a missing plane, the link graph has a cycle, or `entry:` is not an integer resolving to a plane | Recorded as an error. |
| `dup-input` / `input-type` / `tool-input` | duplicate input name, unknown input type, or a command placeholder that is not a declared input | Recorded as an error against the skill. |
| `triggers` / `tool` / `unused-input` / `undeclared-tool` | a skill has no triggers, an empty `tool=`, a declared input its command never uses, or a binary absent from the declared `tools` | Recorded as a warning; does not fail the document. |

## Dependencies

- `./threemd` - the canonical 3md parser (`parse`), used to turn source into the planes every rule inspects.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the agent3md/1 validator (`validateAgent`, `formatReport`) and its rule set. |
</content>
