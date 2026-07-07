---
module: threemd
version: 1
status: draft
files:
  - src/threemd.ts

db_tables: []
depends_on: []
---

# ThreeMD

## Purpose

`threemd` is the canonical 3md parser and serializer this package is built on. A
3md document is Markdown extended along a single free Z axis: a required
frontmatter block, an optional Markdown preamble, then zero or more planes
introduced by `@plane` directives. This module is a faithful TypeScript port of
the Swift `ThreeMD` implementation, including its error behavior, so the shared
conformance vectors under `examples/conformance` pin one grammar across the TS,
Rust, and Swift loaders. Every higher layer (the runtime, the validator, the
loaders) consumes the `Document` this module produces rather than re-parsing 3md.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| `parse` | `parse(source: string): Document`: parse 3md source text into a `Document`, throwing `ParseError` on malformed input. |
| `links` | `links(document: Document): CrossPlaneLink[]`: extract every `[[z=N]]` / `[[z=N\|text]]` cross-plane link from the document's plane bodies, in document order. |
| `serialize` | `serialize(document: Document): string`: render a `Document` back into 3md source text. |

### Structs & Enums

| Type | Description |
|------|-------------|
| `Document` | A parsed 3md document: `version`, `axis`, `title`, `metadata`, `preamble`, and `planes`. |
| `Plane` | One slice along the Z axis: required `z`, optional `label` / `x` / `y`, the non-reserved `attributes`, and the collapsed Markdown `body`. |
| `CrossPlaneLink` | A `[[z=N]]` reference: `sourceZ`, `targetZ`, optional `text`, and `targetExists`. |
| `Axis` | A `string` alias naming what the Z axis represents; always trimmed and lowercased. |
| `ParseErrorCode` | The union of canonical parse-error case names, mirroring the Swift `ParseError` enum. |
| `ParseError` | An `Error` subclass carrying `code` (a `ParseErrorCode`), an optional 1-based `line`, and an optional `detail`. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | TypeScript module; the contract is the exported functions and the shape of `Document` / `Plane`, not an interface hierarchy. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `parse(source: string): Document` | Normalize newlines, strip a leading BOM, then read the frontmatter, interpret it, and split the body into planes. |
| `links` | `links(document: Document): CrossPlaneLink[]` | Scan each plane body for cross-plane links, validating the target as a finite decimal and reporting whether the target plane exists. |
| `serialize` | `serialize(document: Document): string` | Emit frontmatter (sorted metadata), the optional preamble, then one `@plane` directive plus body per plane, terminated by a trailing newline. |

## Invariants

1. Frontmatter is required: the first non-blank line must be `---`, the block must close with a later `---`, and it must carry a non-empty `3md` version key. A missing block, an unterminated block, or a line without a `:` separator is rejected.
2. Before anything else, `\r\n` is normalized to `\n` and a single leading BOM (`U+FEFF`) is stripped, so callers may pass Windows or BOM-prefixed files unchanged.
3. `axis` defaults to `"layer"` and is stored trimmed and lowercased; `title` is optional; frontmatter keys other than `3md`, `axis`, and `title` are preserved verbatim in `metadata`.
4. A `@plane` directive is recognized only when it begins at column 0 (no leading space or tab) and sits outside a fenced code block (three or more backticks or tildes). A `@plane` line inside a fence or indented as code is body text, not a new plane.
5. Every plane requires a finite-decimal `z`; `x`, `y`, and `label` are optional. Attribute keys other than `z`, `x`, `y`, and `label` are carried on the plane's `attributes`.
6. Two planes may not share a `z`; the second occurrence is rejected as a duplicate.
7. Numeric attributes (`z`, `x`, `y`) and link targets accept only finite decimals: an optional sign, digits with an optional fraction, and an optional exponent. Hex, `inf`, `nan`, and values that overflow to infinity are rejected, so the numeric grammar agrees across languages.
8. The directive tokenizer keeps single- or double-quoted spans intact and lets a backslash escape the next character inside a quote; unquoting strips one matching outer pair and reverses `\\` and `\"`. An unterminated quote is a directive error.
9. Frontmatter `metadata` and plane `attributes` are built on null-prototype maps, so an untrusted key such as `__proto__` or `constructor` lands as plain data and never on the object prototype, while still being preserved.
10. A body with no `@plane` directives collapses to a single plane at `z = 0` whose body is the preamble text (with `preamble` then reported as `null`); an entirely blank body yields no planes and a `null` preamble.
11. Plane and preamble bodies have leading and trailing blank lines trimmed; an all-blank body becomes the empty string.
12. `links` returns matches in document order (planes in source order, then left to right within a body); `text` is `null` when the `|text` group is absent and `""` when present but empty; `targetExists` is true only when some plane has a `z` strictly equal to the target. A target that is not a finite decimal is not treated as a link.
13. `serialize` round-trips through `parse` for content that does not rely on quote escaping: metadata keys and extra attributes are emitted in sorted order, and `label` and extra attributes are always quoted.

## Behavioral Examples

```
Given a document whose only content after the frontmatter is a Markdown preamble
When parse is called
Then it yields one plane at z=0 whose body is that preamble and document.preamble is null
```

```
Given a plane body containing "see [[z=2|details]] and [[z=99]]" where only z=2 exists
When links is called on the document
Then it returns a link to z=2 (text "details", targetExists true) followed by a link to z=99 (text null, targetExists false)
```

```
Given a plane whose body contains a fenced code block that itself contains a line "@plane z=5"
When parse is called
Then that line is kept as body text and no plane at z=5 is created
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| `missingFrontmatter` | the source does not begin (after blank lines) with a `---` block | `parse` throws `ParseError` with this code. |
| `invalidFrontmatter` | a frontmatter line lacks a `key: value` separator, or the block is never closed with `---` | `parse` throws with a `detail` describing the offending line. |
| `missingVersion` | the frontmatter has no `3md` key, or its value is empty | `parse` throws with this code. |
| `invalidPlaneDirective` | a directive token is not `key=value`, has an empty key, contains an unterminated quote, or gives a non-finite `x` / `y` / `z` | `parse` throws with the 1-based `line` and a `detail`. |
| `missingPlanePosition` | a `@plane` directive omits `z` | `parse` throws with the directive's `line`. |
| `duplicatePlane` | two planes resolve to the same `z` | `parse` throws with the shared `z` in `detail`. |

## Dependencies

- None. The module is self-contained (Foundation-free, no third-party imports); it mirrors the canonical Swift `Sources/ThreeMD` implementation, and the `examples/conformance` vectors pin the shared behavior.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the canonical 3md parser / serializer (`parse`, `links`, `serialize`) and its document model. |
</content>
