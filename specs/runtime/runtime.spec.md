---
module: runtime
version: 1
status: draft
files:
  - src/runtime.ts

db_tables: []
depends_on: []
---

# Runtime

## Purpose

The runtime is the reference loader for an `agent.3md` file. It treats one 3md
document as a whole agent: the identity plane (explicit `kind=identity`, else the
first plane) is the agent, every other plane is a skill. It builds a small index
over plane attributes so a request can be routed to the right skill and that
skill's body fetched on demand (progressive disclosure) instead of loading the
whole file into context.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| (none) | The module exports no standalone functions; behavior is on the `Agent` class. |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Agent` | Loads one agent.3md and answers manifest / route / get / resolve over its skills. |
| `Skill` | One skill plane: `z`, `name`, `triggers`, `inputs`, `cost`, `deps`, `body`. |
| `AgentManifest` | The agent identity plus a light skill catalog with no skill bodies. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | TypeScript module; no trait/interface contracts beyond the exported types. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `Agent.constructor` | `new Agent(src: string)` | Parse a 3md source string, pick the identity plane, and index every other plane as a skill by name and z. |
| `Agent.manifest` | `manifest(): AgentManifest` | Return identity, model, tools, persona, and a skill catalog with no bodies. |
| `Agent.get` | `get(nameOrZ: string \| number): Skill \| undefined` | O(1) fetch of one skill's full body by name or z. |
| `Agent.route` | `route(text: string): { skill: Skill; score: number; hits: string[] }[]` | Rank skills whose trigger phrases the request satisfies; score is distinct phrases matched, ties broken by lower z. |
| `Agent.resolve` | `resolve(nameOrZ: string \| number): Skill[]` | A skill plus everything it depends on via `[[z=N]]` links, transitively, in load order. |

## Invariants

1. The identity plane is never indexed as a skill.
2. Skill names default to `skill-<z>` when a plane has no label, so every skill is addressable.
3. Tokenization is maximal runs of Unicode letters/digits, lowercased, identical to the Rust and Swift loaders, so routing never diverges across languages.
4. A trigger phrase matches only when every one of its words appears in the request; an empty trigger never matches.
5. `route` returns an empty array when nothing matches; results are sorted by descending score, then ascending z.
6. `resolve` visits each plane at most once, so dependency cycles terminate.

## Behavioral Examples

```
Given an agent.3md whose skill "code-review" has triggers "review, diff"
When route("review my diff") is called
Then "code-review" is returned first with score 2 and hits ["review", "diff"]
```

```
Given a skill whose body contains [[z=6]] linking to "cite-sources"
When resolve("code-review") is called
Then the result is [code-review, cite-sources] in load order
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| parse error | the source is not valid 3md | The `Agent` constructor propagates the parser's thrown error. |
| unknown skill | `get` / `resolve` is given a name or z with no plane | `get` returns `undefined`; `resolve` returns an empty array. |
| no match | `route` text satisfies no trigger phrase | Returns an empty array (never throws). |

## Dependencies

- `./threemd` - the canonical 3md parser (`parse`, `Document`, `Plane`), vendored in this repo.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-06-26 | Initial spec for the reference loader (Agent: manifest / route / get / resolve). |
