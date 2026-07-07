---
module: harnesses
version: 1
status: draft
files:
  - src/validate.test.ts
  - src/integration-demo.ts
  - src/demo.ts
  - src/benchmark.ts
  - src/run.ts
  - src/scale/gen-big-agent.ts
  - src/scale/scale-bench.ts
  - src/scale/scale-bench2.ts

db_tables: []
depends_on: [runtime, validation, threemd]
---

# Harnesses

## Purpose

The harnesses module collects the test suite, interactive demo scripts, execution runners, and scale benchmark utilities used to verify, test, and measure the performance of the agent-3md reference implementation.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| (none) | This module contains executable scripts and test files; it exports no public library functions. |

### Structs & Enums

| Type | Description |
|------|-------------|
| (none) | No public types are exported by this module. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | No traits are defined or exported by this module. |

### Functions

| Script / Test | Running command | Description |
|---------------|-----------------|-------------|
| `validate.test.ts` | `bun test` | Executes conformance and negative validation tests against the loader. |
| `demo.ts` | `bun run src/demo.ts` | Simulates load, routing, and fetch on a standard agent. |
| `integration-demo.ts` | `bun run src/integration-demo.ts` | Runs integration tests verifying skill loading and execution. |
| `benchmark.ts` | `bun run src/benchmark.ts` | Runs benchmark timing parser and loader performance. |
| `run.ts` | `bun run src/run.ts` | Command-line utility runner script. |
| `scale/gen-big-agent.ts` | `bun run src/scale/gen-big-agent.ts` | Generates large mock agent.3md files for scale tests. |
| `scale/scale-bench.ts` | `bun run src/scale/scale-bench.ts` | Benchmarks routing on large-scale agents. |
| `scale/scale-bench2.ts` | `bun run src/scale/scale-bench2.ts` | Benchmarks resolution and transitive dependencies on large-scale agents. |

## Invariants

1. Running `bun test` must execute and pass all validation tests in `validate.test.ts`.
2. Generator script `gen-big-agent.ts` must emit syntactically valid `agent.3md` documents.
3. Scaling and performance benchmarks must run to completion without unhandled exceptions.

## Behavioral Examples

```
Given the conformance test suite
When bun test is executed
Then all 15 tests pass successfully
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| Validation failure | An invalid agent fixture is parsed | The test asserts that the validator correctly flags the error type. |

## Dependencies

- `src/runtime.ts` - Reference loader checked by tests and demos.
- `src/validate.ts` - Reference validator tested by `validate.test.ts`.
- `src/threemd.ts` - Markdown parser utilized in tests and loading.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-07 | Initial spec mapping all test, benchmark, and demo harnesses in the repository. |
