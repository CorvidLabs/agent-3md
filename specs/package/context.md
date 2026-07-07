---
spec: package.spec.md
---

## Context

The package module defines the library entry points of the `@corvidlabs/agent3md` npm package.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Re-exports runtime functionality.

## Design Decisions

- **Separate Helper**: Place `routeQuery` helper in `index-query.ts` to allow light import paths.
