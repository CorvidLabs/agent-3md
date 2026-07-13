---
spec: export.spec.md
---

## User Stories

- As an API client, I want to export the agent's catalog in standard JSON format.

## Acceptance Criteria

### REQ-export-001

The exporter SHALL output a valid JSON representation of `AgentManifest`.

Acceptance Criteria

- Output valid JSON representation of `AgentManifest`.

### REQ-export-002

The exported manifest SHALL include skill triggers, tools, costs, and inputs.

Acceptance Criteria

- Include skill metadata (triggers, tools, costs, inputs).

### REQ-export-003

The exporter SHALL include skill bodies only when requested by the CLI flag.

Acceptance Criteria

- Conditionally include bodies based on CLI flag.

## Constraints

- Print output directly to stdout.

## Out of Scope

- Uploading manifest directly to a remote endpoint.
