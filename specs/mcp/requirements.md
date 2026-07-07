---
spec: mcp.spec.md
---

## User Stories

- As an LLM client, I want to connect to the agent-3md MCP server and call its skills as tools.

## Acceptance Criteria

- Implement `tools/list` to expose the agent's catalog.
- Implement `tools/call` to route and execute commands.
- Provide a robust self-test suite.

## Constraints

- Must conform to the MCP protocol specification.

## Out of Scope

- HTTP/Websocket transports.
