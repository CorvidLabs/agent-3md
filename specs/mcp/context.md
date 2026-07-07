---
spec: mcp.spec.md
---

## Context

The mcp module wraps the runtime loader as a Model Context Protocol (MCP) server, allowing external AI agents to use the skills as tools natively.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Executes the skills queried by MCP.

## Design Decisions

- **Stdio Transport**: Deliver JSON-RPC messages over standard input and output channels.
