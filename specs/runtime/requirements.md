---
spec: runtime.spec.md
---

## User Stories

- As a developer, I want to load an agent configuration and execute skills matching a user request.

## Acceptance Criteria

- Constructor must locate the identity plane and catalog all skills.
- The `route` method must rank skills by trigger match count, breaking ties by lower z.
- The `resolve` method must resolve transitive dependencies in execution order.
- The `command` method must fill template slots and shell-quote inputs.

## Constraints

- Input parsing must match the `agent3md/1` type specification.

## Out of Scope

- Execution of arbitrary non-tool commands.
