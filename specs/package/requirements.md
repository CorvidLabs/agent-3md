---
spec: package.spec.md
---

## User Stories

- As an npm module consumer, I want to import `Agent` and other helpers in my project.

## Acceptance Criteria

### REQ-package-001

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Export `Agent`, `fillCommand`, `commandPlaceholders`.
### REQ-package-002

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Export `routeQuery` from `index-query.ts`.

## Constraints

- Ensure builds emit valid `.d.ts` type declarations.

## Out of Scope

- Packaging node binary wrappers.
