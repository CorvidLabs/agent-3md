# agent.3md — a standard for agents in one file

**One plain-text 3md file is a whole agent.** Plane 0 is the agent (identity,
rules); every other plane is a skill. The frontmatter is the manifest, each
plane's attributes (`triggers=`, `inputs=`, `cost=`) are a queryable index, and
`[[z=N|..]]` links are the skill dependency graph.

The same file is human-readable documentation *and* a machine-queryable skill
index, so the two can never drift. And because skills are addressable planes, an
agent loads **only the one skill it needs** per turn (progressive disclosure)
instead of stuffing every skill into context.

## Why it's good for agents

- **Progressive disclosure.** At 100 skills, loading only the routed skill uses
  **~83% fewer tokens/turn (1420 vs 8300)** (`bun run scale`). And with the
  catalog queried out-of-context (route as a tool), per-turn cost goes **flat**:
  **~94 tokens whether the agent has 10 skills or 100** (`bun run scale2`) — so
  one agent file can hold thousands of skills with no per-turn context growth.
- **One artifact, two readers.** Read it as docs; parse it as an index.
- **Portable, proven.** The same `agent.3md` loads and routes identically in
  **TypeScript, Rust, and Swift** (`loaders/`), each on the canonical 3md parser.
  Plus a JSON projection (`bun run export`) for non-3md consumers.
- **Checkable.** A conformance validator + a language-agnostic vector set
  (`examples/conformance/`) make it a real standard, not a vibe.

## The standard

[`SPEC.md`](./SPEC.md) defines **agent3md/1**: manifest frontmatter, the one
identity plane vs skill planes, the skill contract (triggers / inputs / cost /
dependency links), the loader contract (`manifest` / `route` / `get` /
`resolve`), and the MUST/SHOULD conformance rules.

## What's here

| file | what |
|---|---|
| `agent.3md` | the example agent (Atlas): identity + 6 skills |
| `SPEC.md` | the agent3md/1 standard |
| `src/threemd.ts` | the canonical 3md parser (vendored) |
| `src/runtime.ts` | reference loader: `manifest / route / get / resolve` |
| `src/validate.ts` | conformance validator (+ `examples/invalid/` fixtures) |
| `src/cli.ts` | `agent3md` CLI |
| `src/mcp.ts` | MCP server: exposes an agent's skills as MCP tools |
| `src/export.ts` | JSON manifest projection (`agent3md/1`) for any consumer |
| `loaders/rust`, `loaders/swift` | the same agent loaded via the Rust + Swift parsers |
| `examples/agents/` | more agents (devops, support) — proves generality |
| `examples/conformance/` | labeled valid/invalid vectors for any implementation |
| `src/benchmark.ts`, `src/scale/` | token-savings proof, single + scaled + flat |

## Try it

```sh
bun run demo          # load Atlas, route requests, fetch one skill
bun run run           # route -> load -> EXECUTE (sql-query hits a live DB)
bun run validate agent.3md   # conformance check (exit non-zero on errors)
bun run test          # validator conformance suite
bun run benchmark     # token savings on the example agent
bun run scale         # the savings curve at 10/25/50/100 skills
bun run cli route agent.3md "what rows have a null total?"
bun run mcp:selftest  # spawn the MCP server and call its tools
```

### Use it from any MCP client

Point an MCP-capable agent at the server; its skills appear as tools
(`list_skills`, `route_skill`, `get_skill`, `resolve_skill`):

```json
{ "command": "bun", "args": ["src/mcp.ts", "agent.3md"] }
```

## Status

v1 standard kit: spec, reference loader (TS) plus **Rust and Swift loaders**, a
validator + conformance vectors, CLI, MCP server, JSON projection, and flat
scaling. Roadmap: typed skill inputs and tool bindings so a skill body can
declare the tool it drives, plus publishing the spec. See `SPEC.md` §future.
