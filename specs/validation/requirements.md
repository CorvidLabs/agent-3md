---
spec: validation.spec.md
---

## User Stories

- As a developer, I want to validate my agent.3md configuration file during CI/CD to catch structural errors early.

## Durable Requirements

### REQ-validation-001

The implementation SHALL detect missing agent name.

Acceptance Criteria

- Detect missing agent name.

### REQ-validation-002

The implementation SHALL enforce exactly one identity plane.

Acceptance Criteria

- Enforce exactly one identity plane.

### REQ-validation-003

The implementation SHALL find duplicate skill labels or inputs.

Acceptance Criteria

- Find duplicate skill labels or inputs.

### REQ-validation-004

The implementation SHALL detect dependency cycles.

Acceptance Criteria

- Detect dependency cycles.

### REQ-validation-005

The implementation SHALL verify that command placeholders correspond to declared inputs.

Acceptance Criteria

- Verify that command placeholders correspond to declared inputs.

## Acceptance Criteria

- Detect missing agent name.
- Enforce exactly one identity plane.
- Find duplicate skill labels or inputs.
- Detect dependency cycles.
- Verify that command placeholders correspond to declared inputs.

## Constraints

- Strict mode must treat warnings as errors.

## Out of Scope

- Correcting errors automatically.
