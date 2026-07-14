---
spec: cli.spec.md
---

## User Stories

- As a terminal user, I want to run queries against my agent.3md files and execute filled commands.

## Acceptance Criteria

### REQ-cli-001

The CLI SHALL provide `new`, `manifest`, `skills`, `route`, `get`, `resolve`, and `run` commands.

Acceptance Criteria

- Provide `new`, `manifest`, `skills`, `route`, `get`, `resolve`, and `run` commands.

### REQ-cli-002

The CLI SHALL resolve the default agent file relative to the loader script.

Acceptance Criteria

- Resolve default file relative to the loader script.

### REQ-cli-003

The CLI SHALL execute filled commands using child-process spawning.

Acceptance Criteria

- Execute commands using child process spawn.

## Constraints

- Refuse to execute commands with missing input variables.

## Out of Scope

- Remote server execution.
