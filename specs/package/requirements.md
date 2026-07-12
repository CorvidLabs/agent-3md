---
spec: package.spec.md
---

## User Stories

- As an npm module consumer, I want to import `Agent` and other helpers in my project.

## Durable Requirements

### REQ-package-001

The implementation SHALL export `Agent`, `fillCommand`, `commandPlaceholders`.

Acceptance Criteria

- Export `Agent`, `fillCommand`, `commandPlaceholders`.

### REQ-package-002

The implementation SHALL export `routeQuery` from `index-query.ts`.

Acceptance Criteria

- Export `routeQuery` from `index-query.ts`.

## Acceptance Criteria

- Export `Agent`, `fillCommand`, `commandPlaceholders`.
- Export `routeQuery` from `index-query.ts`.

## Constraints

- Ensure builds emit valid `.d.ts` type declarations.

## Out of Scope

- Packaging node binary wrappers.
