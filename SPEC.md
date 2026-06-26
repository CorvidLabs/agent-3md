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
| `model` | MAY | A *suggested* default model the agent was built against. It is a hint, not a requirement: the runner may override it, and the agent should work on any sufficiently capable model. Omit it to stay model-agnostic. |
| `axis` | SHOULD | `skill` (the Z axis enumerates skills). |
| `tools` | MAY | Comma-separated names of the real binaries the agent's skills run (e.g. `rg, jq, git`). When present, a skill's bound command SHOULD use one of them. |
| `persona` | MAY | One-line behavioral summary. |
| `version` | MAY | Agent version, distinct from the format version. |
| `entry` | MAY | The `z` of the plane to start from (default: the identity plane). |

The only required frontmatter is `3md` and a name. Everything else, `model`
included, is an optional hint. Any other key is preserved as agent metadata and
is implementation-defined.

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
| `inputs` | Comma-separated typed inputs the skill expects (see below). |
| `tool` | Optional. A runnable command this skill drives, as a template, e.g. `rg --line-number {pattern} {path}`. The first token is the binary; `{name}` placeholders are filled from the skill's inputs (see below). |
| `cost` | Optional tag for side-effect / resource class (e.g. `net`, `db`). |

**Typed inputs.** Each item in `inputs` is `name`, `name:type`, or `name:type?`.
A trailing `?` marks the input **optional**; otherwise it is required. A bare
name (`question`) is a required `string`. `type` is one of a closed set:
`string`, `number`, `boolean`, `object`, `array`. The bare comma-separated form
(`inputs="question, schema"`) is still valid: every name is a required `string`,
so older agents keep working unchanged.

**Command templates.** When `tool` is a command, its `{placeholder}` slots name
the skill's inputs. The contract that ties them together:

- Every `{placeholder}` in the command **MUST** be a declared input.
- A declared input the command never references is a likely mistake (a SHOULD;
  loaders warn).
- The command's binary (its first token) SHOULD appear in the agent's `tools`.

A loader fills the template from concrete values (shell-quoting them) to produce
the exact command to run. The loop is **route -> fill -> run**: route a request
to a skill, fill its inputs, run its command. A `tool` without placeholders (a
bare binary, or an opaque id) is still valid; it just is not parameterized.

**Not every skill is a command.** `tool` is optional. A skill with no `tool` is
**guidance only**: its body is a playbook the agent follows using whatever
capabilities the host already gives it. Web search, a judgment call, an action
routed to a host or MCP tool, none of these need a CLI binding; the skill just
describes what to do, and `command()` returns null for it. A real agent is
usually a mix of command-backed and guidance-only skills.

The plane **body** is the skill's instructions, the prompt the agent loads when
the skill is selected.

**Dependencies** are expressed as 3md cross-plane links in the body, in either
form: `[[z=N]]` or `[[z=N|label]]`. Both declare that this skill depends on the
skill at plane `N`. A loader resolves these transitively so a skill arrives with
everything it needs.

Example skill plane:

```
@plane z=1 label="search" kind=skill triggers="search, find, grep, code" inputs="pattern:string, path:string" tool="rg --line-number {pattern} {path}"
# Skill: search

Find code by regex. Prefer this over reading whole files. Fill {pattern} (the
regex) and {path} (a file or directory), then run. For broader context, see
[[z=2|files]].
```

`route("find every TODO")` selects `search`; filling `pattern=TODO path=src`
yields `rg --line-number 'TODO' 'src'`.

---

## 4. Loader contract

A conforming loader parses the document once with a 3md parser, builds an index,
and MUST expose these operations (names illustrative; see `src/runtime.ts` for a
reference implementation):

| Operation | Returns |
|-----------|---------|
| `manifest()` | The agent name, model, tools, persona, the identity body, and a **body-less** catalog of skills (`name`, `z`, `triggers`, `cost`, `tool`). |
| `route(text)` | Skills whose triggers `text` satisfies, ranked by the number of **distinct trigger phrases matched** (best first), ties broken by lower `z`; each result carries the matched phrases. Tokens are maximal runs of Unicode letters/digits, lowercased. No match returns an empty list. |
| `get(name \| z)` | A single skill including its full body. O(1). |
| `resolve(name \| z)` | The skill plus its transitive dependency chain (following `[[z=N]]` / `[[z=N|label]]` links), each skill once, dependency-complete. |
| `command(name \| z, values)` | The skill's `tool` command with its `{placeholder}` slots filled (shell-quoted) from `values`; null if the skill has no `tool`. |

The intended loop is **route -> fill -> run**: route the request, fill the chosen
skill's inputs, run its command. `manifest()` is cheap to keep resident; skill
bodies (and their commands) are fetched on demand.

---

## 5. Conformance

A document is a conforming `agent3md/1` agent if:

- **MUST** be valid 3md (`3md: 1.0`) and parse without error.
- **MUST** have a name (`title` or `agent`). `model` is an optional hint, not required.
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
- **MUST**, for each declared input, use a canonical type (`string`, `number`,
  `boolean`, `object`, `array`); a bare name is a required `string`.
- **MUST NOT** declare the same input name twice within one skill.
- **SHOULD**, if a skill sets `tool`, make it non-empty.
- **MUST**, for each `{placeholder}` in a skill's `tool` command, have a matching
  declared input. (A declared input the command never uses is a SHOULD-not.)
- **SHOULD**, when `tools` is declared, have each skill's command binary listed
  in it (so the manifest does not lie about what the agent runs).

A conforming loader **MUST** ignore unknown frontmatter keys and unknown plane
attributes rather than failing.

---

## 6. Minimal complete example

```
---
3md: 1.0
axis: skill
agent: dev
tools: rg, fd
---
A terminal-first dev agent. No model line: the runner picks the model.

@plane z=0 label="dev" kind=identity
# dev
Route each request to the matching skill, fill its inputs, run its command.

@plane z=1 label="search" kind=skill triggers="find, search, grep, code" inputs="pattern:string, path:string" tool="rg --line-number {pattern} {path}"
# Skill: search
Find code by regex. For filenames instead of contents, see [[z=2|files]].

@plane z=2 label="files" kind=skill triggers="files, list, locate, glob" inputs="glob:string, dir:string" tool="fd {glob} {dir}"
# Skill: files
List files matching a name pattern under a directory.
```

`route("find every TODO")` selects `search`; `command("search", {pattern: "TODO",
path: "src"})` yields `rg --line-number 'TODO' 'src'`.

---

## 7. Future / cross-language

Because 3md parsers are maintained in Swift, TypeScript, and Rust against a
shared conformance suite, `agent3md/1` loaders can be implemented identically in
each: the format does the parsing, this spec defines the agent layer on top.

Typed `inputs` and per-skill `tool` bindings (above) were added this way:
additively, so an older untyped agent stays valid and an older loader simply
ignores the `tool` attribute. A future revision may standardize capability
scopes in the same additive manner. A small JSON projection of the manifest for
cross-process discovery already ships (`bun run export`, `schema: agent3md/1`).
```
