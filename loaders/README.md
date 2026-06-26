# Cross-language loaders

The same `agent.3md` loaded and routed in three languages, each on the canonical
3md parser, proving the format is portable. All build from a fresh clone, no
sibling checkout required.

| dir | parser source | run |
|---|---|---|
| `rust/` | the `threemd` crate from crates.io | `cd rust && cargo run -- manifest ../../agent.3md` (full `agent3md` CLI: `manifest`/`skills`/`route`/`get`/`resolve`/`validate`) |
| `swift/` | the `ThreeMD` package, fetched from GitHub (`CorvidLabs/3md`, tag 1.7.17) | `cd swift && swift run` |

The TypeScript reference loader is the self-contained one (`../src/runtime.ts`,
with the parser vendored at `../src/threemd.ts`).

## How each gets the parser

- **Swift** depends on the canonical package straight from git, so nothing local
  is needed:
  ```swift
  .package(url: "https://github.com/CorvidLabs/3md.git", from: "1.7.17")
  ```
- **Rust** depends on the published `threemd` crate from crates.io
  (`threemd = "1.0"`), so nothing local is needed either.
