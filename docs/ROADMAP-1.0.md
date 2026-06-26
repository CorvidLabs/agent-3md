# Road to 1.0.0

agent.3md v0.x is a working reference kit, not a finished product. Before it
went anywhere public it was put through an adversarial review by a council of
independent reviewers, who ran the code and verified the claims rather than
taking them on faith. This doc records what they found, what is fixed, and what
1.0.0 still needs. We would rather publish the gaps than hide them.

## The review (6 lenses)

| lens | score | the core finding |
|---|---|---|
| Spec rigor | 5/10 | spec, validator, and runtime disagreed on identity fallback, missing labels, and cycles |
| Code / API | 6.5/10 | dependency-link regex mismatch; routing scored term frequency, not coverage; no Unicode |
| Claims audit | 3/10 | the scaling benchmark was misleading (filler-word routing failures, toy skill sizes, hidden catalog cost) |
| Security | 6/10 | no code execution and no fs/network from document content (good); but unbounded stdin, proto-key clobbering, raw path read |
| Adoption / DX | 5/10 | npm-install auth friction, no CI, no `.d.ts`, "standard" oversold at v0.1 |
| Portability | 6/10 | manifest and get identical across TS/Rust/Swift; routing diverged on alphanumeric and repeated words |

## Fixed in this pass

- **One dependency-link grammar** (`[[z=N]]` and `[[z=N|label]]`) across the
  runtime, validator, spec, and the Rust and Swift loaders. (Four reviewers
  independently flagged the old mismatch.)
- **Spec / validator / runtime reconciled**: identity fallback is valid,
  missing or empty labels error, `entry` must be an integer z, dependency cycles
  are detected and rejected. New conformance vectors for each.
- **Routing v2, identical in all three languages**: Unicode tokenization,
  scoring by distinct trigger-phrase coverage (kills stop-word false positives),
  deterministic tie-break by lowest z, empty result on no match. Cross-language
  parity is now proven on the queries that used to diverge.
- **Honest benchmark**: realistic ~300-token skills, distinct triggers, and
  **routing accuracy is measured (100% on these sets), not assumed**. Strategy C
  now counts the tool round-trip and the server-side catalog rather than hiding
  them. Headline is now real: about 64% fewer tokens per turn on the 6-skill
  agent, growing with skill count, and per-turn in-context cost stays roughly
  flat if the catalog is externalized (at the cost of a tool call).
- **Security hardening**: stdin size cap, JSON-RPC id validation, `.3md` path
  and document-size guards on the MCP server.
- **Adoption**: CI runs `bun test` plus the Rust and Swift loader builds (so the
  parity claim is guarded); the package now ships real `.d.ts` declarations; the
  install docs spell out the GitHub Packages `read:packages` PAT.

## Still needed for 1.0.0

- A cleaner install path (public npm registry, or keep GitHub Packages but make
  the token step truly one command).
- Parser-level hardening upstream in `CorvidLabs/3md` (allocate parsed
  attribute maps with a null prototype to remove the proto-key landmine).
- Typed skill `inputs` and tool bindings, so a skill body can declare the tool
  it drives (`SPEC.md` §future).
- Real external adopters. Until then this is a proposed format, not a standard.
