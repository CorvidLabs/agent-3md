---
module: loader-rust
version: 1
status: draft
files:
  - loaders/rust/src/main.rs

db_tables: []
depends_on: []
---

# Rust Loader

## Purpose

`loader-rust` is a native `agent3md` CLI built on the canonical `threemd` Rust
crate. It mirrors the TypeScript CLI (`src/cli.ts`) and validator
(`src/validate.ts`) so the agent3md/1 standard has a fast, dependency-light,
cross-language tool that produces the same routing, resolution, and validation
results as the reference loader. It is a binary crate: the surface is its
command-line grammar and its embedded conformance tests, not a Rust library API.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| (none) | Binary crate (`fn main`); the contract is the CLI grammar below plus parity with the TS reference. |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Skill` | A skill built from a non-identity plane: `z` (i64), `name`, `triggers`, `input_schema`, `tool`, `cost`, `deps`, `body`. |
| `SkillInput` | A typed input: `name`, `type_`, `required`. |
| `Issue` | A validation finding: `rule`, `msg`, optional `z`. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | No public traits; deterministic ordering comes from `BTreeMap` / `BTreeSet`. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `build_skills` | `build_skills(doc: &Document) -> Vec<Skill>` | Index every non-identity plane into a `Skill`, resolving the identity via `identity_z`. |
| `parse_inputs` | `parse_inputs(v: Option<&String>) -> Vec<SkillInput>` | Parse the `name` / `name:type` / `name:type?` grammar; a bare name is a required string. |
| `command_placeholders` / `fill_command` | over `&str` / `&BTreeMap` | Extract `{name}` placeholders and fill them (shell-quoted), leaving unprovided ones visible. |
| `parse_deps` | `parse_deps(body: &str) -> Vec<i64>` | Pull `[[z=N]]` / `[[z=N\|label]]` integer targets from a body. |
| `tokenize` / `route` | over `&str` / `&[Skill]` | Lowercased Unicode letter/digit runs; rank skills by matched trigger phrases, ties broken by `z`. |
| `resolve` | `resolve(skills, name) -> Vec<&Skill>` | A skill plus its transitive `[[z=N]]` dependencies, in load order. |
| `validate` | `validate(doc: &Document) -> (Vec<Issue>, Vec<Issue>)` | The agent3md/1 rule set, returning errors and warnings. |
| `main` | `main()` | Dispatch `manifest` / `skills` / `route` / `get` / `resolve` / `run` / `validate`. |

## Invariants

1. Parsing goes through the canonical `threemd` crate, so this loader and the TS parser agree on the document model.
2. Skill indexing, input parsing, dependency extraction, tokenization, routing, and resolution mirror the TS runtime grammar exactly, so a request routes to the same skill in every language.
3. Plane positions are handled as `i64`, and `[[z=N]]` link targets are integers; `BTreeMap` / `BTreeSet` give deterministic, sorted iteration.
4. `validate` mirrors `src/validate.ts` rule for rule: `frontmatter`, `identity`, `missing-label`, `unique-skill`, `dead-link`, `entry`, `cycle`, `dup-input`, `input-type`, and `tool-input` errors, plus `triggers`, `tool`, `unused-input`, and `undeclared-tool` warnings; a `model:` is not required. Cycles are found by a three-color depth-first search.
5. The file argument is used when it ends in `.3md` or exists on disk; otherwise the command falls back to `agent.3md` in the current directory.
6. `route` and `run` print `no skill matched` and return normally when nothing matches; a skill with no `tool` is treated as guidance and `run` prints its body.
7. `run --exec` executes the filled command via `sh -c`, exiting with its status, and refuses to run while any placeholder is unfilled.
8. `validate` exits 0 when there are no errors and 1 otherwise; an unreadable file for `validate` exits 2.
9. The embedded `#[cfg(test)]` suite pins the loader against the shared `examples/conformance` and `examples/invalid` vectors, asserting valid documents pass and invalid ones raise the expected rule.

## Behavioral Examples

```
Given the same agent.3md and request text
When the Rust "route" command and the TS "route" command both run
Then they rank the same skills in the same order with the same matched triggers
```

```
Given examples/conformance/invalid-cycle.3md
When the validate command (or the test harness) runs
Then it reports a cycle error and exits non-zero
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| no such file | the resolved file does not exist (non-validate command) | Prints `no such file` plus usage and exits 1. |
| not valid 3md | the parser rejects the source | Non-validate commands fail with usage (exit 1); `validate` prints a `parse` issue and exits 1. |
| unreadable file (validate) | `validate` cannot read the file | Prints `cannot read` and exits 2. |
| missing argument | `route` / `get` / `resolve` / `run` lack their required text or name | Prints an error plus usage and exits 1. |
| unfilled `--exec` | `run --exec` still has unfilled placeholders | Prints the missing inputs plus usage and exits 1. |
| unknown command | the verb is not recognized | Prints `unknown command` plus usage and exits 1. |

## Dependencies

- `threemd` - the canonical 3md parser crate (`parse`, `Document`, `Plane`).
- The Rust standard library only (`std::collections`, `std::process`, `std::fs`); no third-party runtime crates.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the native Rust agent3md CLI and validator, mirroring the TS reference. |
</content>
