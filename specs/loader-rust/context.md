---
spec: loader-rust.spec.md
---

## Context

The loader-rust module is a native Rust port of the agent-3md CLI and validation engine, designed for performance and zero-dependency environments.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): TS loader mirrored by this port.

## Design Decisions

- **Single Binary**: Expose both CLI execution and validator checks in one lightweight executable.
