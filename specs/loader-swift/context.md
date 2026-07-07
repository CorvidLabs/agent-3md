---
spec: loader-swift.spec.md
---

## Context

The loader-swift module is the Swift port, verifying that agent-3md is fully portable to native macOS/iOS environments.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): TS loader mirrored by this port.

## Design Decisions

- **Sendable Models**: Ensure all structures conform to `Sendable` to be safe under Swift concurrency.
