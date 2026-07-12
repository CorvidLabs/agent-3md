---
spec: runtime.spec.md
---

## User Stories

- As a developer, I want to load an agent configuration and execute skills matching a user request.

## Acceptance Criteria

### REQ-runtime-001

The constructor SHALL locate the identity plane and catalog all skills.

Acceptance Criteria

- Constructor must locate the identity plane and catalog all skills.
### REQ-runtime-002

The `route` method SHALL rank skills by trigger match count, breaking ties by lower z.

Acceptance Criteria

- The `route` method must rank skills by trigger match count, breaking ties by lower z.
### REQ-runtime-003

The `resolve` method SHALL resolve transitive dependencies in execution order.

Acceptance Criteria

- The `resolve` method must resolve transitive dependencies in execution order.
### REQ-runtime-004

The `command` method SHALL fill template slots and shell-quote inputs.

Acceptance Criteria

- The `command` method must fill template slots and shell-quote inputs.

## Constraints

- Input parsing must match the `agent3md/1` type specification.

## Out of Scope

- Execution of arbitrary non-tool commands.
