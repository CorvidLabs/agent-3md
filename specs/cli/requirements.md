---
spec: cli.spec.md
---

## User Stories

- As a terminal user, I want to run queries against my agent.3md files and execute filled commands.

## Durable Requirements

### REQ-cli-001

The implementation SHALL provide `new`, `manifest`, `skills`, `route`, `get`, `resolve`, and `run` commands.

Acceptance Criteria

- Provide `new`, `manifest`, `skills`, `route`, `get`, `resolve`, and `run` commands.

### REQ-cli-002

The implementation SHALL resolve default file relative to the loader script.

Acceptance Criteria

- Resolve default file relative to the loader script.

### REQ-cli-003

The implementation SHALL execute commands using child process spawn.

Acceptance Criteria

- Execute commands using child process spawn.

## Acceptance Criteria

- Provide `new`, `manifest`, `skills`, `route`, `get`, `resolve`, and `run` commands.
- Resolve default file relative to the loader script.
- Execute commands using child process spawn.

## Constraints

- Refuse to execute commands with missing input variables.

## Out of Scope

- Remote server execution.
