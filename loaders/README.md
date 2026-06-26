# Cross-language loaders

The same `agent.3md` loaded and routed in three languages, each on the canonical
3md parser, proving the format is portable. All build from a fresh clone, no
sibling checkout required.

| dir | parser source | run |
|---|---|---|
| `rust/` | the `threemd` crate, vendored at `vendor/threemd` | `cd rust && cargo run -- manifest ../../agent.3md` (full `agent3md` CLI: `manifest`/`skills`/`route`/`get`/`resolve`/`validate`) |
| `swift/` | the `ThreeMD` package, fetched from GitHub (`CorvidLabs/3md`, tag 1.7.17) | `cd swift && swift run` |

The TypeScript reference loader is the self-contained one (`../src/runtime.ts`,
with the parser vendored at `../src/threemd.ts`).

## How each gets the parser

- **Swift** depends on the canonical package straight from git, so nothing local
  is needed:
  ```swift
  .package(url: "https://github.com/CorvidLabs/3md.git", from: "1.7.17")
  ```
- **Rust** cannot point a git dependency at a subdirectory, so the `threemd`
  crate is vendored into `vendor/threemd` and referenced by path
  (`threemd = { path = "../vendor/threemd" }`). Publishing the crate to
  crates.io is the eventual cleaner path; then this vendor copy can be dropped
  for a registry version.
