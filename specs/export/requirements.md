---
spec: export.spec.md
---

## User Stories

- As an API client, I want to export the agent's catalog in standard JSON format.

## Acceptance Criteria

### REQ-export-001

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Output valid JSON representation of `AgentManifest`.
### REQ-export-002

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Include skill metadata (triggers, tools, costs, inputs).
### REQ-export-003

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Conditionally include bodies based on CLI flag.

## Constraints

- Print output directly to stdout.

## Out of Scope

- Uploading manifest directly to a remote endpoint.
