---
spec: validation.spec.md
---

## User Stories

- As a developer, I want to validate my agent.3md configuration file during CI/CD to catch structural errors early.

## Acceptance Criteria

### REQ-validation-001

Validation SHALL report a missing agent name.

Acceptance Criteria

- Detect missing agent name.

### REQ-validation-002

Validation SHALL enforce exactly one identity plane.

Acceptance Criteria

- Enforce exactly one identity plane.

### REQ-validation-003

Validation SHALL report duplicate skill labels and duplicate inputs.

Acceptance Criteria

- Find duplicate skill labels or inputs.

### REQ-validation-004

Validation SHALL detect dependency cycles.

Acceptance Criteria

- Detect dependency cycles.

### REQ-validation-005

Validation SHALL require every command placeholder to name a declared input.

Acceptance Criteria

- Verify that command placeholders correspond to declared inputs.

## Constraints

- Strict mode must treat warnings as errors.

## Out of Scope

- Correcting errors automatically.
