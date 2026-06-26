# agent.3md: a format for agents in one file

**One plain-text 3md file is a whole agent.** Plane 0 is the agent (identity,
rules); every other plane is a skill. The frontmatter is the manifest, each
plane's attributes (`triggers=`, `inputs=`, `cost=`) are a queryable index, and
`[[z=N|..]]` links are the skill dependency graph.

The same file is human-readable documentation *and* a machine-queryable skill
index, so the two can never drift. And because skills are addressable planes, an
agent loads **only the one skill it needs** per turn (progressive disclosure)
instead of stuffing every skill into context.

## Quickstart (2 minutes)

**Use the library.** It's on GitHub Packages. That registry needs a token even
for public packages, so create a classic personal access token with the
`read:packages` scope, then point the `@corvidlabs` scope at the registry and
install:

```sh
printf '@corvidlabs:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT\n' > .npmrc
npm install @corvidlabs/agent3md
```

```ts
import { Agent, validateAgent } from "@corvidlabs/agent3md";
import { readFileSync } from "node:fs";

const src = readFileSync("agent.3md", "utf8");
console.log(validateAgent(src).ok);                  // true
const agent = new Agent(src);
console.log(agent.route("summarize this")[0].skill.name);  // -> "summarize"
const skill = agent.get("summarize");                // load ONE skill on demand
```

**Or scaffold and drive it from this repo:**

```sh
git clone https://github.com/CorvidLabs/agent-3md && cd agent-3md
bun run cli new my-agent              # writes a valid starter my-agent.3md
bun run validate my-agent.3md         # PASS
bun run cli route my-agent.3md "find the latest release notes"
bun run mcp my-agent.3md              # serve its skills to any MCP client
```

## Why it's good for agents

- **Progressive disclosure.** The agent loads only the one skill a request needs,
  not all of them. On the real 6-skill example that is about **64% fewer tokens
  per turn at 100% routing accuracy** (`bun run benchmark`). With realistic
  ~300-token skills, loading one instead of dumping the whole file is about **96%
  fewer per turn at 100 skills** (`bun run scale`). Routing accuracy depends on
  writing distinct triggers, and the benchmark measures it, it is not assumed.
- **Flat at scale, honestly.** Move the catalog out of the prompt and query it
  with a routing tool, and per-turn in-context cost stays roughly flat (about
  **520 tokens whether the agent has 10 skills or 100**, `bun run scale2`). That
  is not free: it costs a tool round-trip per turn plus a catalog that lives in
  the loader, but it decouples per-turn prompt size from skill count.
- **One artifact, two readers.** Read it as docs; parse it as an index.
- **Portable, proven.** The same `agent.3md` loads and routes identically in
  **TypeScript, Rust, and Swift** (`loaders/`), each on the canonical 3md parser.
  Plus a JSON projection (`bun run export`) for non-3md consumers.
- **Checkable.** A conformance validator + a language-agnostic vector set
  (`examples/conformance/`) make it checkable, not a vibe.

## The spec

[`SPEC.md`](./SPEC.md) defines **agent3md/1**: manifest frontmatter, the one
identity plane vs skill planes, the skill contract (triggers / inputs / cost /
dependency links), the loader contract (`manifest` / `route` / `get` /
`resolve`), and the MUST/SHOULD conformance rules.

## What's here

| file | what |
|---|---|
| `agent.3md` | the example agent (Atlas): identity + 6 skills |
| `SPEC.md` | the agent3md/1 spec |
| `src/threemd.ts` | the canonical 3md parser (vendored) |
| `src/runtime.ts` | reference loader: `manifest / route / get / resolve` |
| `src/validate.ts` | conformance validator (+ `examples/invalid/` fixtures) |
| `src/cli.ts` | `agent3md` CLI |
| `src/mcp.ts` | MCP server: exposes an agent's skills as MCP tools |
| `src/export.ts` | JSON manifest projection (`agent3md/1`) for any consumer |
| `loaders/rust`, `loaders/swift` | the same agent loaded via the Rust + Swift parsers |
| `examples/agents/` | more agents (devops, support); proves generality |
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

Early (v0.x), a working reference kit, not a finished product: the spec, loaders
in TypeScript, Rust, and Swift, a validator with conformance vectors, a CLI, an
MCP server, and a JSON projection. It is a proposed format with no external users
yet, so treat it as a proof of concept you can build on. It was put through an
adversarial review; see [`docs/ROADMAP-1.0.md`](./docs/ROADMAP-1.0.md) for the
findings and what 1.0.0 needs (crates.io publish to drop Rust vendoring, typed
skill inputs, tool bindings, and real adopters).
