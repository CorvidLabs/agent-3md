---
spec: export.spec.md
---

## User Stories

- As an API client, I want to export the agent's catalog in standard JSON format.

## Acceptance Criteria

- Output valid JSON representation of `AgentManifest`.
- Include skill metadata (triggers, tools, costs, inputs).
- Conditionally include bodies based on CLI flag.

## Constraints

- Print output directly to stdout.

## Out of Scope

- Uploading manifest directly to a remote endpoint.
