# agent3md/1 conformance vectors

Test files for any agent3md/1 loader or validator, in any language. Run each
through your validator: every `valid-*.3md` MUST pass with zero errors, and every
`invalid-*.3md` MUST be rejected by the rule named below.

Reference check (this repo): `bun run src/validate.ts examples/conformance/<file>`
(exits 0 on pass, 1 on error).

## Valid

| file | exercises |
|---|---|
| `valid-minimal.3md` | smallest conforming agent: required frontmatter (`3md`, `model`, `title`), one identity plane, one skill |
| `valid-deps.3md` | skills with `[[z=N]]` dependency links to real planes |
| `valid-cost.3md` | optional `cost=` tags and `inputs=` on skills |
| `valid-entry.3md` | `entry:` frontmatter resolving to a real plane |
| `valid-fallback-identity.3md` | no `kind=identity`: the first plane is the identity by the fallback rule |
| `valid-typed-inputs.3md` | typed inputs (`name:type?`) and a per-skill `tool=` binding |
| `valid-command.3md` | a command template (`tool="rg ... {pattern} {path}"`) whose placeholders match its inputs (also: no `model`, which is optional) |

## Invalid (one rule each)

| file | rule it must fail | why |
|---|---|---|
| `invalid-two-identities.3md` | `identity` | more than one identity plane |
| `invalid-missing-label.3md` | `missing-label` | a skill plane has no `label` |
| `invalid-dup-skill.3md` | `unique-skill` | two skills share a label |
| `invalid-dead-link.3md` | `dead-link` | `[[z=42]]` targets a non-existent plane |
| `invalid-cycle.3md` | `cycle` | a `[[z=N]]` dependency chain forms a loop |
| `invalid-missing-frontmatter.3md` | `frontmatter` | missing required `model:` |
| `invalid-bad-entry.3md` | `entry` | `entry:` is not a real plane `z` |
| `invalid-bad-input-type.3md` | `input-type` | an input declares a type outside the canonical set |
| `invalid-dup-input.3md` | `dup-input` | a skill declares the same input name twice |
| `invalid-bad-placeholder.3md` | `tool-input` | a command `{placeholder}` has no matching declared input |

Note: `invalid-missing-frontmatter.3md` now exercises a missing **name** (`title`
/ `agent`), since `model` became an optional hint rather than a requirement.

Each invalid file violates exactly one rule and is otherwise conforming, so a
correct validator should report that rule (and only that rule) as the error.
