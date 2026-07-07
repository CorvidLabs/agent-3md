---
spec: export.spec.md
---

## Context

The export module outputs a clean, schema-conforming JSON manifest of the agent and its catalog for use by registry services or frontend tools.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Collects catalog metadata to export.

## Design Decisions

- **Progressive Disclosure**: Exclude plane bodies by default unless the `--bodies` flag is explicitly passed.
