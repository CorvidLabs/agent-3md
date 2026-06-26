---
module: runtime
version: 3
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
| `fillCommand` | `fillCommand(template, values)`: fill a `{name}` command template from values, shell-quoting them; unprovided placeholders stay visible. |
| `commandPlaceholders` | `commandPlaceholders(template)`: the placeholder names a command template references, de-duplicated. |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Agent` | Loads one agent.3md and answers manifest / route / get / resolve / command over its skills. |
| `Skill` | One skill plane: `z`, `name`, `triggers`, `inputs` (names), `inputSchema` (typed), `tool` (command template), `binary` (first token of tool), `cost`, `deps`, `body`. |
| `SkillInput` | A typed input: `name`, `type` (string/number/boolean/object/array), `required`. |
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
| `Agent.command` | `command(nameOrZ: string \| number, values?: Record<string, string>): string \| null` | The skill's `tool` command with `{placeholder}` slots filled from values; null if the skill has no tool. |

## Invariants

1. The identity plane is never indexed as a skill.
2. Skill names default to `skill-<z>` when a plane has no label, so every skill is addressable.
3. Tokenization is maximal runs of Unicode letters/digits, lowercased, identical to the Rust and Swift loaders, so routing never diverges across languages.
4. A trigger phrase matches only when every one of its words appears in the request; an empty trigger never matches.
5. `route` returns an empty array when nothing matches; results are sorted by descending score, then ascending z.
6. `resolve` visits each plane at most once, so dependency cycles terminate.
7. `inputs` (names) is derived from `inputSchema`, so the two never disagree; a bare input name parses as a required `string`.
8. `tool` is `null` unless the plane sets a non-empty `tool` attribute; `binary` is the first whitespace-token of `tool`, else `null`.
9. `command` fills `{placeholder}` slots from values and shell-quotes them; a placeholder without a value is left literally in the output.

## Behavioral Examples

```
Given an agent.3md whose skill "search" has triggers "search, find, grep"
When route("find every TODO") is called
Then "search" is returned first with hits including "find"
```

```
Given the "search" skill bound to tool "rg --line-number {pattern} {path}"
When command("search", { pattern: "TODO", path: "src" }) is called
Then it returns rg --line-number 'TODO' 'src'
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
| 2 | 2026-06-26 | Add typed inputs (`inputSchema`, `SkillInput`) and per-skill `tool` bindings; additive. |
| 3 | 2026-06-26 | `tool` is a command template; add `Skill.binary`, `Agent.command`, and exported `fillCommand` / `commandPlaceholders`. Model is now optional. |
