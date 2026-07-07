---
spec: harnesses.spec.md
---

## Context

The harnesses module aggregates unit test suites, interactive demos, and scaling benchmarks used to test the TS reference loader's stability and speed.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Tested by harnesses.

## Design Decisions

- **Benchmark Scripts**: Kept separate from the core package to minimize bundle size.
