---
spec: validation.spec.md
---

## Context

The validation module ensures that a loaded agent.3md document strictly conforms to the agent3md/1 standard, preventing runtime errors in AI clients.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Uses validation to verify safety before execution.

## Design Decisions

- **Detailed Error Context**: Return structured validation results with rule names and specific error locations.
