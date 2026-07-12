---
spec: harnesses.spec.md
---

## User Stories

- As a developer, I want to verify validator correctness and test loader performance under heavy loads.

## Durable Requirements

### REQ-harnesses-001

The implementation SHALL provide conformance test execution via `bun test`.

Acceptance Criteria

- Provide conformance test execution via `bun test`.

### REQ-harnesses-002

The implementation SHALL generate mock agent files of various sizes.

Acceptance Criteria

- Generate mock agent files of various sizes.

### REQ-harnesses-003

The implementation SHALL benchmark routing and resolution.

Acceptance Criteria

- Benchmark routing and resolution.

## Acceptance Criteria

- Provide conformance test execution via `bun test`.
- Generate mock agent files of various sizes.
- Benchmark routing and resolution.

## Constraints

- Benchmark execution must run within normal memory limits.

## Out of Scope

- Production web dashboard.
