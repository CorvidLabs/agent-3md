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

## Invalid (one rule each)

| file | rule it must fail | why |
|---|---|---|
| `invalid-no-identity.3md` | `identity` | no plane marked `kind=identity` |
| `invalid-two-identities.3md` | `identity` | more than one identity plane |
| `invalid-dup-skill.3md` | `unique-skill` | two skills share a label |
| `invalid-dead-link.3md` | `dead-link` | `[[z=42]]` targets a non-existent plane |
| `invalid-missing-frontmatter.3md` | `frontmatter` | missing required `model:` |
| `invalid-bad-entry.3md` | `entry` | `entry:` points at a plane that does not exist |

Each invalid file violates exactly one rule and is otherwise conforming, so a
correct validator should report that rule (and only that rule) as the error.
