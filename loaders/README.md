# Cross-language loaders

The same `agent.3md` loaded and routed in three languages, each on the canonical
3md parser, proving the format is portable.

| dir | parser | run |
|---|---|---|
| `rust/` | the `threemd` Rust crate | `cd rust && cargo run -- manifest ../../agent.3md` (also a full `agent3md` CLI: `manifest`/`skills`/`route`/`get`/`resolve`/`validate`) |
| `swift/` | the `ThreeMD` Swift package | `cd swift && swift run` |

The TypeScript reference loader is the self-contained one (`../src/runtime.ts`,
with the parser vendored at `../src/threemd.ts`).

**Prerequisite for the Rust/Swift loaders:** they depend on the canonical 3md
parser via a local path (`../../../3md`), so check out
[`CorvidLabs/3md`](https://github.com/CorvidLabs/3md) as a sibling directory:

```
parent/
  3md/         <- the canonical parser (Swift / TypeScript / Rust)
  agent-3md/   <- this repo
```

Future: point these at the published crate / Swift package so no sibling
checkout is needed.
