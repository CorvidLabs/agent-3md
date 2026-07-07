# agent.3md: a format for agents in one file

[![npm version](https://img.shields.io/npm/v/@corvidlabs/agent3md.svg)](https://www.npmjs.com/package/@corvidlabs/agent3md)
[![crates.io version](https://img.shields.io/crates/v/agent3md.svg)](https://crates.io/crates/agent3md)
[![CI Build Status](https://github.com/CorvidLabs/agent-3md/actions/workflows/trust.yml/badge.svg)](https://github.com/CorvidLabs/agent-3md/actions)
[![spec coverage](https://img.shields.io/endpoint?url=https://corvidlabs.github.io/agent-3md/badges/coverage.json)](https://corvidlabs.github.io/agent-3md/)
[![Spec Status](https://img.shields.io/badge/spec-standard-brightgreen)](SPEC.md)
[![License](https://img.shields.io/github/license/CorvidLabs/agent-3md)](LICENSE)

**One plain-text 3md file is a whole agent.** Plane 0 is the agent (identity, rules); every other plane is a skill. The frontmatter is the manifest, each plane's attributes (`triggers=`, typed `inputs=`, `tool=`, `cost=`) are a queryable index, and `[[z=N|..]]` links are the skill dependency graph.

Skills are **real**. A skill can bind to an actual CLI command (`tool=`), and then its typed inputs are that command's arguments, so routing is not "read some prose," it is **route -> fill -> run**: pick the skill, fill its inputs, get the exact command to run.

```
@plane z=1 label="search" kind=skill triggers="search, find, grep" inputs="pattern:string, path:string" tool="rg --line-number {pattern} {path}"
```

A `tool` is **optional**. Skills that are not command-shaped (web research, a judgment call, anything the host's own tools handle) carry no `tool` and are pure guidance the agent follows with whatever capabilities it has. So a real agent is usually a mix: some skills run a command, some are a playbook.

The same file is human-readable documentation *and* a machine-queryable skill index, so the two can never drift. And because skills are addressable planes, an agent loads **only the one skill it needs** per turn (progressive disclosure) instead of stuffing every skill into context.

---

## Quickstart

There are multiple ways in, by design. **TypeScript is the reference implementation**, the package you embed in an agent; it carries the spec, the validator, and the MCP server. **Rust is the default native CLI**, a single fast binary for the command line with no runtime to install. **Swift is the native iOS/macOS loader**, bringing full portability.

### Embed the library (TypeScript)

It is on the public npm registry, no token or `.npmrc` needed:

```sh
npm install @corvidlabs/agent3md
```

```ts
import { Agent, validateAgent } from "@corvidlabs/agent3md";
import { readFileSync } from "node:fs";

const src = readFileSync("agent.3md", "utf8");
console.log(validateAgent(src).ok);                  // true
const agent = new Agent(src);
const top = agent.route("find every TODO")[0].skill; // -> "search"
console.log(agent.command(top.name, { pattern: "TODO", path: "src" }));
// -> rg --line-number 'TODO' 'src'   (route -> fill -> run)
```

### Install the CLI (Rust)

A fast native binary with no runtime:

```sh
cargo install agent3md
agent3md run agent.3md "find every TODO" pattern=TODO path=src          # route -> command
agent3md run agent.3md "find every TODO" pattern=TODO path=src --exec   # and run it
agent3md validate agent.3md                                            # exit non-zero on errors
```

### Swift Loader

A clean Swift Package Manager loader depending on the canonical `ThreeMD` package:

```swift
import Agent3MD

let agent = try Agent(source: sourceString)
let routed = agent.route("find every TODO")
```

---

## Why it is good for agents

- **Progressive disclosure.** The agent loads only the one skill a request needs, not all of them. On the real 6-skill example that is about **73% fewer tokens per turn at 100% routing accuracy** (`bun run benchmark`). With realistic ~300-token skills, loading one instead of dumping the whole file is about **96% fewer per turn at 100 skills** (`bun run scale`). Routing accuracy depends on writing distinct triggers, and the benchmark measures it, it is not assumed.
- **Flat at scale.** Move the catalog out of the prompt and query it with a routing tool, and per-turn in-context cost stays roughly flat (about **520 tokens whether the agent has 10 skills or 100**, `bun run scale2`). That is not free: it costs a tool round-trip per turn plus a catalog that lives in the loader, but it decouples per-turn prompt size from skill count.
- **One artifact, two readers.** Read it as docs; parse it as an index.
- **Portable, proven.** The same `agent.3md` loads and routes identically in **TypeScript, Rust, and Swift** (`loaders/`), each on the canonical 3md parser. Plus a JSON projection (`bun run export`) for non-3md consumers.
- **Checkable.** A conformance validator + a language-agnostic vector set (`examples/conformance/`) make it checkable, not a vibe. Fully verified by native test suites in TypeScript, Rust, and Swift.

---

## The Spec

[`SPEC.md`](./SPEC.md) defines **agent3md/1**: manifest frontmatter, the one identity plane vs skill planes, the skill contract (triggers / typed inputs / `tool` command templates / cost / dependency links), the loader contract (`manifest` / `route` / `get` / `resolve` / `command`), and the MUST/SHOULD conformance rules.

---

## Repository Structure

| File/Dir | What it does |
|---|---|
| `agent.3md` | The flagship agent (`dev`): a terminal-first toolbox, identity + 7 skills (6 command-backed + 1 guidance-only) |
| `SPEC.md` | The authoritative `agent3md/1` standard |
| `src/runtime.ts` | Reference TypeScript loader: `manifest / route / get / resolve / command` |
| `src/validate.ts` | Conformance validator (+ `examples/invalid/` fixtures) |
| `src/cli.ts` | TypeScript `agent3md` CLI |
| `src/mcp.ts` | MCP server: exposes an agent's skills as MCP tools |
| `loaders/rust` | Native Rust CLI and loader, with native conformance tests |
| `loaders/swift` | Native Swift loader, with XCTest conformance tests |
| `examples/conformance/` | Labeled valid/invalid vectors for any implementation |

---

## Verifying Local Changes

Run the CI gate lane via fledge:

```sh
fledge lanes run verify
```

This verify lane runs the TypeScript reference tests, compiles the typed bundle, runs Rust fmt/clippy/conformance tests, and executes Swift conformance unit tests.

---

## Status: v1.0.0 (Production Ready)

Version 1.0.0 is the production release of the `agent3md/1` standard. It is fully verified with native conformance tests across TypeScript, Rust, and Swift, featuring typed inputs, per-skill tool bindings, CLI-backed executable tools, and a built-in MCP server.
