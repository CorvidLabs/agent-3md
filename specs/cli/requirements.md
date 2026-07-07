---
spec: cli.spec.md
---

## User Stories

- As a terminal user, I want to run queries against my agent.3md files and execute filled commands.

## Acceptance Criteria

- Provide `new`, `manifest`, `skills`, `route`, `get`, `resolve`, and `run` commands.
- Resolve default file relative to the loader script.
- Execute commands using child process spawn.

## Constraints

- Refuse to execute commands with missing input variables.

## Out of Scope

- Remote server execution.
