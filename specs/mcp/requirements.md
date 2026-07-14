---
spec: mcp.spec.md
---

## User Stories

- As an LLM client, I want to connect to the agent-3md MCP server and call its skills as tools.

## Acceptance Criteria

### REQ-mcp-001

The MCP server SHALL implement `tools/list` to expose the agent catalog.

Acceptance Criteria

- Implement `tools/list` to expose the agent's catalog.

### REQ-mcp-002

The MCP server SHALL implement `tools/call` to route and execute commands.

Acceptance Criteria

- Implement `tools/call` to route and execute commands.

### REQ-mcp-003

The MCP server SHALL provide a self-test suite for its protocol behavior.

Acceptance Criteria

- Provide a robust self-test suite.

## Constraints

- Must conform to the MCP protocol specification.

## Out of Scope

- HTTP/Websocket transports.
