---
spec: validation.spec.md
---

## User Stories

- As a developer, I want to validate my agent.3md configuration file during CI/CD to catch structural errors early.

## Acceptance Criteria

### REQ-validation-001

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Detect missing agent name.
### REQ-validation-002

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Enforce exactly one identity plane.
### REQ-validation-003

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Find duplicate skill labels or inputs.
### REQ-validation-004

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Detect dependency cycles.
### REQ-validation-005

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Verify that command placeholders correspond to declared inputs.

## Constraints

- Strict mode must treat warnings as errors.

## Out of Scope

- Correcting errors automatically.
