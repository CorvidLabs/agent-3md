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
## CorvidLabs trust toolchain

This repository uses one trust gate. Every session must use it and must not bypass or weaken it.

- Run `fledge trust verify` before calling a change complete.
- Keep module specs synchronized with implementation changes.
- Treat an Augur block verdict as a hard stop that must be surfaced and de-risked.
- Record and verify provenance with Attest after the repository's verification lane passes.
- Keep generated trust configuration and this managed block in place.

<!-- CorvidLabs trust toolchain: END -->
