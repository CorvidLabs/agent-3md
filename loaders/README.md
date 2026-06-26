# Cross-language loaders

The same `agent.3md` loaded and routed in three languages, each on the canonical
3md parser, proving the format is portable. All build from a fresh clone, no
sibling checkout required.

| dir | parser source | run |
|---|---|---|
| `rust/` | the `threemd` crate from crates.io | `cargo install agent3md` then `agent3md manifest agent.3md` (full CLI: `manifest`/`skills`/`route`/`get`/`resolve`/`validate`), or from here `cd rust && cargo run -- manifest ../../agent.3md` |
| `swift/` | the `ThreeMD` package, fetched from GitHub (`CorvidLabs/3md`, tag 1.7.17) | `cd swift && swift run` |

**TypeScript is the reference implementation** (`../src/runtime.ts`, with the
parser vendored at `../src/threemd.ts`): the self-contained loader that carries
the spec, the validator, and the MCP server, and is the package you embed in an
agent. **Rust is the default native CLI**, published to crates.io as
[`agent3md`](https://crates.io/crates/agent3md), so the command line needs no
runtime: `cargo install agent3md`. Swift proves the format ports to a third
language. All three route and validate identically.

## How each gets the parser

- **Swift** depends on the canonical package straight from git, so nothing local
  is needed:
  ```swift
  .package(url: "https://github.com/CorvidLabs/3md.git", from: "1.7.17")
  ```
- **Rust** depends on the published `threemd` crate from crates.io
  (`threemd = "1.0"`), so nothing local is needed either.
