---
module: package
version: 1
status: draft
files:
  - src/index.ts
  - src/index-query.ts

db_tables: []
depends_on: []
---

# Package

## Purpose

`package` is the published entry point of `@corvidlabs/agent3md`. `src/index.ts`
is the barrel that re-exports the supported public surface (the runtime `Agent`
and its helpers, the validator, and the underlying 3md parser) so consumers
import from one place and internal file layout can change without breaking them.
`src/index-query.ts` adds the tier-2 routing helper: instead of carrying a whole
skill catalog in a model's context, an agent calls `routeQuery` as a tool so the
trigger index stays "server-side" in the loader and only skill names come back,
keeping per-turn context independent of how many skills the agent has.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| `routeQuery` | `routeQuery(agent: Agent, text: string): string[]`: the names of the skills matching `text`, ranked, with everything else about the match dropped. |
| `Agent`, `fillCommand`, `commandPlaceholders` | Re-exported from `./runtime` (the reference loader and its command-template helpers). |
| `validateAgent`, `formatReport` | Re-exported from `./validate` (the agent3md/1 validator). |
| `parse` | Re-exported from `./threemd` (the canonical 3md parser). |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Skill`, `SkillInput`, `AgentManifest` | Runtime types, re-exported. |
| `Report`, `Issue`, `IssueLevel` | Validator types, re-exported. |
| `Document`, `Plane` | 3md document types, re-exported. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | TypeScript package surface; the contract is the set of re-exports plus `routeQuery`. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `routeQuery` | `routeQuery(agent: Agent, text: string): string[]` | Route the request through the agent and return only the ranked skill names. |

## Invariants

1. The barrel re-exports only the supported surface; each re-export forwards to a single source module (`runtime`, `validate`, or `threemd`) so consumers never import internal paths directly.
2. `routeQuery` is a thin projection over `Agent.route`: it preserves the runtime's ranking order and returns exactly the matched skills' names, dropping score and hit detail.
3. `routeQuery` returns an empty array when nothing matches, mirroring the runtime's no-match behavior (it never throws for a non-match).

## Behavioral Examples

```
Given an Agent whose "search" skill ranks first for a request
When routeQuery(agent, "find every TODO") is called
Then it returns ["search", ...] in the runtime's ranking order
```

```
Given a consumer importing from "@corvidlabs/agent3md"
When it imports Agent, validateAgent, and parse
Then all three resolve through the barrel without reaching into src internals
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| (none) | `routeQuery` receives a request that matches nothing | Returns an empty array; it adds no error paths of its own beyond those of the runtime it wraps. |

## Dependencies

- `./runtime` - `Agent` and the command-template helpers, plus the `routeQuery` input type.
- `./validate` - the validator functions and report types.
- `./threemd` - the parser and document types.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the public barrel and the tier-2 `routeQuery` routing helper. |
</content>
