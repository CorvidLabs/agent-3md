---
spec: runtime.spec.md
---

## User Stories

- As a developer, I want to load an agent configuration and execute skills matching a user request.

## Acceptance Criteria

### REQ-runtime-001

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Constructor must locate the identity plane and catalog all skills.
### REQ-runtime-002

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- The `route` method must rank skills by trigger match count, breaking ties by lower z.
### REQ-runtime-003

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- The `resolve` method must resolve transitive dependencies in execution order.
### REQ-runtime-004

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- The `command` method must fill template slots and shell-quote inputs.

## Constraints

- Input parsing must match the `agent3md/1` type specification.

## Out of Scope

- Execution of arbitrary non-tool commands.
