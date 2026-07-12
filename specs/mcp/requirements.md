---
spec: mcp.spec.md
---

## User Stories

- As an LLM client, I want to connect to the agent-3md MCP server and call its skills as tools.

## Durable Requirements

### REQ-mcp-001

The implementation SHALL implement `tools/list` to expose the agent's catalog.

Acceptance Criteria

- Implement `tools/list` to expose the agent's catalog.

### REQ-mcp-002

The implementation SHALL implement `tools/call` to route and execute commands.

Acceptance Criteria

- Implement `tools/call` to route and execute commands.

### REQ-mcp-003

The implementation SHALL provide a robust self-test suite.

Acceptance Criteria

- Provide a robust self-test suite.

## Acceptance Criteria

- Implement `tools/list` to expose the agent's catalog.
- Implement `tools/call` to route and execute commands.
- Provide a robust self-test suite.

## Constraints

- Must conform to the MCP protocol specification.

## Out of Scope

- HTTP/Websocket transports.
