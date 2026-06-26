# The `agent.3md` Standard

**Version:** `agent3md/1`
**Status:** draft
**Base format:** [3md](https://corvidlabs.github.io/3md/) `3md: 1.0`

An `agent.3md` file is a complete agent in one plain-text document: its identity
plus all of its skills. The same bytes are human-readable documentation and a
machine-queryable skill index.

---

## 1. Rationale

A 3md document is Markdown extended along one named Z axis: a frontmatter header
plus a series of `@plane` slices. That shape is an unusually good fit for an
agent:

- **One artifact, two readers.** Read it top to bottom and it is the agent's
  documentation. Parse it and it is a structured skill catalog. The skill index
  and the skill instructions are the *same bytes*, so they cannot drift apart.
- **Progressive disclosure.** Each skill is its own plane. A runtime loads the
  manifest once, then fetches only the single skill plane a request needs,
  instead of putting every skill in context. This is the core efficiency win.
- **Portable.** 3md has conformance-verified parsers in Swift, TypeScript, and
  Rust, so a conforming loader can be written in any of them from the same spec.

---

## 2. Document shape

### 2.1 Frontmatter (the manifest)

The frontmatter is the agent's manifest.

| Key | Req? | Meaning |
|-----|------|---------|
| `3md` | **MUST** | Base-format version. `1.0`. |
| `title` *or* `agent` | **MUST** | The agent's name. (`title` is the display name; `agent` is a short id.) |
| `model` | **MUST** | Default model id the agent runs on. |
| `axis` | SHOULD | `skill` (the Z axis enumerates skills). |
| `version` | MAY | Agent version, distinct from the format version. |
| `tools` | MAY | Comma-separated tool/capability names the agent may use. |
| `persona` | MAY | One-line behavioral summary. |
| `entry` | MAY | The `z` of the plane to start from (default: the identity plane). |

Any other frontmatter key is preserved as agent metadata and is implementation-defined.

### 2.2 Planes (identity + skills)

Each `@plane` carries a `z` (its position), an optional `label` (its name),
optional attributes, and a Markdown body.

- **Exactly one identity plane.** It carries `kind=identity` and is conventionally
  `z=0`. Its body is the agent's system prompt / operating rules. If no plane
  declares `kind=identity`, the first plane (lowest `z`) is the identity plane.
- **Every other plane is a skill** (`kind=skill`). Its `label` is the skill name
  and its body is the skill's instructions.

---

## 3. The skill plane contract

A skill plane is `@plane z=N label="<name>" kind=skill` plus these attributes:

| Attribute | Meaning |
|-----------|---------|
| `triggers` | Comma-separated trigger phrases. A phrase matches a request when **every** word in the phrase appears in the request (case-insensitive). So `look up` matches only when both `look` and `up` are present, never on `up` alone. |
| `inputs` | Comma-separated names of the data this skill expects. |
| `cost` | Optional tag for side-effect / resource class (e.g. `net`, `db`). |

The plane **body** is the skill's instructions, the prompt the agent loads when
the skill is selected.

**Dependencies** are expressed as 3md cross-plane links in the body, in either
form: `[[z=N]]` or `[[z=N|label]]`. Both declare that this skill depends on the
skill at plane `N`. A loader resolves these transitively so a skill arrives with
everything it needs.

Example skill plane:

```
@plane z=3 label="sql-query" kind=skill triggers="sql, database, query, rows, select" inputs="question, schema" cost="db"
# Skill: sql-query

Answer questions against a SQL database.

1. Read the schema; map the question to tables/columns.
2. Write a single read-only SELECT; confirm before any mutation.
3. Cite the result set (see [[z=6|cite-sources]]).
```

---

## 4. Loader contract

A conforming loader parses the document once with a 3md parser, builds an index,
and MUST expose these operations (names illustrative; see `src/runtime.ts` for a
reference implementation):

| Operation | Returns |
|-----------|---------|
| `manifest()` | The agent name, model, tools, persona, the identity body, and a **body-less** catalog of skills (`name`, `z`, `triggers`, `cost`). |
| `route(text)` | Skills whose triggers `text` satisfies, ranked by the number of **distinct trigger phrases matched** (best first), ties broken by lower `z`; each result carries the matched phrases. Tokens are maximal runs of Unicode letters/digits, lowercased. No match returns an empty list. |
| `get(name \| z)` | A single skill including its full body. O(1). |
| `resolve(name \| z)` | The skill plus its transitive dependency chain (following `[[z=N]]` / `[[z=N|label]]` links), each skill once, dependency-complete. |

The intended loop is **route → load → execute**: route the request, load only
the resolved skill chain, run it. `manifest()` is cheap to keep resident;
skill bodies are fetched on demand.

---

## 5. Conformance

A document is a conforming `agent3md/1` agent if:

- **MUST** be valid 3md (`3md: 1.0`) and parse without error.
- **MUST** have a name (`title` or `agent`) and a `model`.
- **MUST** have exactly one identity plane (explicit `kind=identity`, or the
  first plane by the fallback rule). All other planes are skills.
- **MUST** give every skill a unique, non-empty name (`label`).
- **MUST** ensure every `[[z=N]]` or `[[z=N|label]]` link targets an existing plane.
- **MUST NOT** contain dependency cycles (`[[z=N]]` chains that form a loop).
- **MUST**, if `entry` is set, have it be a plane `z` (an integer) that exists.
- **SHOULD** give every skill a non-empty `triggers` list (a skill with no
  triggers is reachable only by name/`z`, never by `route()`).
- **SHOULD** keep skill bodies self-contained so a single skill can be loaded
  without its siblings.

A conforming loader **MUST** ignore unknown frontmatter keys and unknown plane
attributes rather than failing.

---

## 6. Minimal complete example

```
---
3md: 1.0
axis: skill
title: Scout
model: claude-opus-4-8
tools: web
---
Scout finds things and explains them plainly.

@plane z=0 label="Scout" kind=identity
# Scout
Route each request to the matching skill, load only that plane, and act.

@plane z=1 label="search" kind=skill triggers="find, search, look up, latest" inputs="query"
# Skill: search
Issue 2-3 queries, read the best results, then hand off to [[z=2|explain]].

@plane z=2 label="explain" kind=skill triggers="explain, eli5, what is, how does" inputs="topic"
# Skill: explain
Give the one-sentence answer first, then three plain bullets.
```

`route("find the latest on X")` → `search`; `resolve("search")` →
`[search, explain]`; `get("explain")` → just that plane's body.

---

## 7. Future / cross-language

Because 3md parsers are maintained in Swift, TypeScript, and Rust against a
shared conformance suite, `agent3md/1` loaders can be implemented identically in
each: the format does the parsing, this spec defines the agent layer on top. A
future revision may standardize richer attributes (typed `inputs`, explicit
`tool` bindings per skill, capability scopes) and a small JSON projection of the
manifest for cross-process discovery — additively, without breaking `agent3md/1`.
```
