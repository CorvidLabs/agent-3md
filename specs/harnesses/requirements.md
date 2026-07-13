---
spec: harnesses.spec.md
---

## User Stories

- As a developer, I want to verify validator correctness and test loader performance under heavy loads.

## Acceptance Criteria

### REQ-harnesses-001

The conformance harness SHALL execute through `bun test`.

Acceptance Criteria

- Provide conformance test execution via `bun test`.

### REQ-harnesses-002

The generator SHALL create mock agent files at multiple sizes.

Acceptance Criteria

- Generate mock agent files of various sizes.

### REQ-harnesses-003

The benchmark harness SHALL measure routing and dependency resolution.

Acceptance Criteria

- Benchmark routing and resolution.

## Constraints

- Benchmark execution must run within normal memory limits.

## Out of Scope

- Production web dashboard.
