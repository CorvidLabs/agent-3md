---
spec: export.spec.md
---

## User Stories

- As an API client, I want to export the agent's catalog in standard JSON format.

## Durable Requirements

### REQ-export-001

The implementation SHALL output valid JSON representation of `AgentManifest`.

Acceptance Criteria

- Output valid JSON representation of `AgentManifest`.

### REQ-export-002

The implementation SHALL include skill metadata (triggers, tools, costs, inputs).

Acceptance Criteria

- Include skill metadata (triggers, tools, costs, inputs).

### REQ-export-003

The implementation SHALL conditionally include bodies based on CLI flag.

Acceptance Criteria

- Conditionally include bodies based on CLI flag.

## Acceptance Criteria

- Output valid JSON representation of `AgentManifest`.
- Include skill metadata (triggers, tools, costs, inputs).
- Conditionally include bodies based on CLI flag.

## Constraints

- Print output directly to stdout.

## Out of Scope

- Uploading manifest directly to a remote endpoint.
