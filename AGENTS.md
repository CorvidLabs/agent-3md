# agent-3md

One 3md file is a whole agent (identity plus on-demand skills). See
[README.md](README.md) for the pitch and [SPEC.md](SPEC.md) for the agent3md/1
format definition. The reference implementation is the TypeScript loader; Rust
and Swift loaders prove the format ports.

## Project map

- `src/runtime.ts` - the reference loader (`Agent`: manifest / route / get / resolve).
- `src/validate.ts` - the agent3md/1 conformance validator.
- `src/threemd.ts` - the canonical 3md parser, vendored.
- `src/cli.ts`, `src/mcp.ts`, `src/export.ts` - CLI, MCP server, JSON projection.
- `loaders/rust` - the native `agent3md` CLI (published to crates.io).
- `loaders/swift` - the Swift loader on the canonical ThreeMD package.
- `specs/` - the spec-sync contracts for the source modules.
- `examples/conformance/` - labeled valid/invalid vectors for any implementation.
- `SPEC.md` - the authoritative agent3md/1 specification.

## Conventions

TypeScript is the reference and the package you embed; Rust is the default native
CLI. Default to Bun for the TypeScript toolchain (`bun test`, `bun build`,
`bun install`). Keep the three loaders behaviorally identical: routing,
validation, and dependency resolution must not diverge across languages.

<!-- CorvidLabs trust toolchain: BEGIN (managed, do not edit inside) -->
## CorvidLabs trust toolchain (standing rules)

This repo is governed by four CLIs. Every session MUST use them; never bypass or weaken them.

- fledge: run `fledge lanes run verify` before calling any change done. It must pass.
- spec-sync: when you change a module with a *.spec.md, update the spec, then `fledge spec check`. (skipped: <reason>, if content-only)
- augur: `augur check --staged` before a commit; `augur check --range origin/main..HEAD` before merge. A block verdict is a hard stop, never auto-overridden.
- attest: after a green lane, `attest sign --commit HEAD --reviewer agent:<id> --from-augur augur.json --tests-passed`.

CI enforces the same gate (.github/workflows/trust.yml) and fails if this block is missing. Brand rule: no em-dash characters in anything you write.
<!-- CorvidLabs trust toolchain: END -->
