---
module: mcp
version: 1
status: draft
files:
  - src/mcp.ts
  - src/mcp-selftest.ts

db_tables: []
depends_on: []
---

# MCP

## Purpose

`mcp` serves one `agent.3md` file's skills to any MCP-capable client over
newline-delimited JSON-RPC 2.0 on stdio, so a packaged agent can be driven by a
host that speaks the Model Context Protocol. The server (`src/mcp.ts`) loads the
agent once, exposes four skill tools, and answers requests one JSON object per
line. The self-test (`src/mcp-selftest.ts`) is the executable conformance check:
it spawns the server as a child process, drives the normal request flow, and
probes the robustness guards, exiting non-zero if any response is missing or a
guard fails. Both are scripts, not libraries.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| (none) | Executable scripts; the contract is the JSON-RPC wire protocol and the exposed tool set. |

### Structs & Enums

| Type | Description |
|------|-------------|
| (none) | Uses `Agent` from the runtime; declares no exported types. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | stdio JSON-RPC entry point. |

### Functions

| Surface | Shape | Description |
|---------|-------|-------------|
| `initialize` | JSON-RPC method | Returns protocol version `2024-11-05`, a `tools` capability, and `serverInfo` named `agent-3md:<agent>`. |
| `ping` | JSON-RPC method | Returns an empty result, used as a liveness check. |
| `tools/list` | JSON-RPC method | Returns the four tool descriptors and their JSON input schemas. |
| `tools/call` | JSON-RPC method | Dispatches to a named tool with `arguments`. |
| `list_skills` | tool | Returns the skill catalog (name, triggers, cost) as JSON, loading no bodies. |
| `route_skill` | tool | Ranks skills matching `text` by trigger hits. |
| `get_skill` | tool | Returns one skill's full body by `name`. |
| `resolve_skill` | tool | Returns a skill plus its dependency chain, names and bodies. |

## Invariants

1. Only JSON-RPC responses are written to stdout, one compact JSON object per line; all logging goes to stderr, so the protocol stream stays clean.
2. The agent path is resolved to an absolute path and must end in `.3md`; a non-`.3md` path, an unreadable file, or a parse failure logs to stderr and exits 1 before serving.
3. Document size is capped at 5 MiB and any single unbroken input line at 10 MiB; a document over the cap refuses to load, and an oversize line without a delimiter is dropped with a `-32700` parse error rather than buffered without bound.
4. Notifications (a message with no `id`) are accepted and produce no response.
5. A request `id` must be a string or number; an object, array, or boolean id is rejected with `-32600` and a `null` id, never echoing the bad id back.
6. Input is framed on newlines; blank lines are skipped, and a line that is not valid JSON yields a `-32700` parse error with a `null` id.
7. Tool results are returned as MCP `content` text blocks; `get_skill` and `resolve_skill` on an unknown skill return an `isError` result rather than a JSON-RPC error.
8. `route_skill`, `get_skill`, and `resolve_skill` delegate to the runtime `Agent`, so routing and resolution match the reference loader exactly.
9. The self-test passes only when every normal request (id 1 to 5) is answered without error and all three guards hold: a malformed line yields `-32700`, an object id yields `-32600` without echoing the id, and a following `ping` still answers (the server survives bad input).

## Behavioral Examples

```
Given the running server and a "search" skill
When a tools/call for route_skill with text "find every TODO in src" arrives
Then the response content lists search ranked by its matched trigger hits
```

```
Given a request whose id is the object { bad: true }
When the server handles it
Then it replies with error -32600 and id null, and does not echo the bad id
```

```
Given a malformed (non-JSON) line followed by a valid ping
When the server processes both
Then it emits a -32700 parse error for the bad line and still answers the ping
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| startup failure | non-`.3md` path, unreadable file, oversize document, or parse error | Logs to stderr and exits 1 before accepting requests. |
| `-32700` parse error | a line is not valid JSON, or a single line exceeds the size cap | Emits a response with `null` id and code `-32700`. |
| `-32600` invalid request | the request `id` is not a string, number, or null | Emits a response with `null` id and code `-32600`. |
| `-32601` method not found | an unknown JSON-RPC method | Emits an error result echoing the request id. |
| `-32602` unknown tool | `tools/call` names a tool that does not exist | Emits an error result echoing the request id. |
| tool `isError` | `get_skill` / `resolve_skill` names an unknown skill | Returns a successful JSON-RPC result whose content is flagged `isError`. |

## Dependencies

- `./runtime` - `Agent` (manifest / route / get / resolve) drives every tool.
- `node:fs`, `node:path`, `node:url`, and `Bun.stdin` / `Bun.spawn` for path safety, stdio framing, and (in the self-test) spawning the server.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the MCP stdio server and its conformance self-test. |
</content>
