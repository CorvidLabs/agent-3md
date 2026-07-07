---
spec: validation.spec.md
---

## User Stories

- As a developer, I want to validate my agent.3md configuration file during CI/CD to catch structural errors early.

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
