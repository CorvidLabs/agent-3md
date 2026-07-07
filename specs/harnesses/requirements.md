---
spec: harnesses.spec.md
---

## User Stories

- As a developer, I want to verify validator correctness and test loader performance under heavy loads.

## Acceptance Criteria

- Provide conformance test execution via `bun test`.
- Generate mock agent files of various sizes.
- Benchmark routing and resolution.

## Constraints

- Benchmark execution must run within normal memory limits.

## Out of Scope

- Production web dashboard.
