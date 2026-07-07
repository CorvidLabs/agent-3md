---
module: loader-swift
version: 1
status: draft
files:
  - loaders/swift/Sources/Agent3MD/Agent3MD.swift
  - loaders/swift/Sources/Agent3MDCLI/main.swift
  - loaders/swift/Package.swift
  - loaders/swift/Tests/Agent3MDTests/Agent3MDTests.swift

db_tables: []
depends_on: []
---

# Swift Loader

## Purpose

`loader-swift` is a Swift port of the agent3md/1 loader, proving the standard is
portable beyond TypeScript. The `Agent3MD` library builds on the canonical
`ThreeMD` Swift package and mirrors the reference loader's contract: parse one
`agent.3md`, expose its identity and skills, and answer route / get / resolve /
command over them. A small executable target demonstrates the library from the
command line, and an XCTest suite pins the port against the shared agent and
conformance vectors. The module comprises the library, the CLI, the SwiftPM
manifest, and the tests.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| `csv` | `csv(_ value: String?) -> [String]`: split a comma list, trimming and dropping empties. |
| `parseInputs` | `parseInputs(_ value: String?) -> [SkillInput]`: parse the `name` / `name:type` / `name:type?` grammar. |
| `fillCommand` | `fillCommand(_ template: String, _ values: [String: String]) -> String`: fill `{name}` placeholders (shell-quoted), leaving unprovided ones visible. |
| `depLinks` | `depLinks(in body: String) -> [Int]`: extract `[[z=N]]` / `[[z=N\|label]]` integer targets. |
| `tokenize` | `tokenize(_ s: String) -> [String]`: lowercased runs of Unicode letters / digits. |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Agent` | A `Sendable` value type: `name`, `model`, `tools`, `identity`, `skills`, with route / get / resolve / command over its skills. |
| `Skill` | A `Sendable` skill: `z`, `name`, `triggers`, `inputs`, `inputSchema`, `tool`, `cost`, `deps`, `body`. |
| `SkillInput` | A `Sendable` typed input: `name`, `type`, `required`. |

### Traits

| Trait | Description |
|-------|-------------|
| `Sendable` | `Agent`, `Skill`, and `SkillInput` all conform to `Sendable`, so they cross concurrency boundaries safely. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `Agent.init` | `init(source: String) throws` | Parse the source through `ThreeMD.Parser`, pick the identity plane, and index every other plane as a skill by name and z. |
| `Agent.get` | `get(_ name: String) -> Skill?` / `get(z: Int) -> Skill?` | O(1) fetch of one skill by name or z. |
| `Agent.route` | `route(_ text: String) -> [(skill: Skill, score: Int, hits: [String])]` | Rank skills by matched trigger phrases; ties broken by lower z. |
| `Agent.resolve` | `resolve(_ name: String) -> [Skill]` | A skill plus its transitive `[[z=N]]` dependencies, in load order. |
| `Agent.command` | `command(_ name: String, _ values: [String: String]) -> String?` / `command(z: Int, ...)` | The skill's `tool` filled from values, or nil when it has no tool. |

## Invariants

1. Parsing goes through the canonical `ThreeMD` Swift package (declared as a dependency on `github.com/CorvidLabs/3md` from 1.7.17), so the Swift and TS parsers agree on the document model.
2. Input parsing, dependency extraction, tokenization, and command filling mirror the TS runtime grammar exactly, so routing and resolution never diverge across languages.
3. All model types (`Agent`, `Skill`, `SkillInput`) are value types conforming to `Sendable`, following the CorvidLabs Swift conventions.
4. The identity plane is the explicit `kind=identity` plane, or (fallback) the first plane, and it is excluded from `skills`. `name` is `title` else the `agent` metadata else `"agent"`; `model` defaults to `"unknown"`; `tools` comes from the `tools` metadata.
5. `route` sorts by descending matched-phrase count, ties broken by ascending z, and a trigger phrase matches only when all of its tokens appear in the request.
6. `resolve` visits each plane at most once, so dependency cycles terminate; `command` returns nil for a skill with no `tool`.
7. The SwiftPM manifest (`Package.swift`, tools 6.0) declares the `Agent3MD` library, an `Agent3MDCLI` executable, and an `Agent3MDTests` test target.
8. The CLI resolves `agent.3md` relative to its own source file (so it works regardless of the working directory) unless invoked as `route <file> <text...>`, which routes against the given file and prints the top match.
9. The XCTest suite pins the port against the packaged `agent.3md` (name, tools, skill count, routing to `search`) and the shared `examples/conformance` vectors (typed inputs, cost, command filling, and dependency resolution order).

## Behavioral Examples

```
Given examples/conformance/valid-command.3md and a "search" skill bound to rg
When agent.command("search", ["pattern": "TODO", "path": "src"]) is called
Then it returns rg --line-number 'TODO' 'src'
```

```
Given examples/conformance/valid-deps.3md where "answer" links to "cite"
When agent.resolve("answer") is called
Then it returns [answer, cite] in load order
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| parse error | the source is not valid 3md | `Agent(source:)` throws the `ThreeMD` parser's error. |
| unknown skill | `get` / `resolve` / `command` names a skill with no plane | `get` returns nil, `resolve` returns an empty array, `command` returns nil. |
| unbound skill | `command` targets a skill with no `tool` | Returns nil. |

## Dependencies

- `ThreeMD` - the canonical 3md parser Swift package (`Parser`, `Document`, `Plane`), depended on from `github.com/CorvidLabs/3md`.
- `Foundation` - `NSRegularExpression` (placeholder and link extraction) and file reading in the CLI and tests.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the Swift agent3md loader library, CLI, package manifest, and tests. |
</content>
