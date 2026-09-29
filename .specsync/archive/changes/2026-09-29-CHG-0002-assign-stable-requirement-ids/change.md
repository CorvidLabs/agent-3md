---
id: CHG-0002-assign-stable-requirement-ids
state: archived
type: documentation
base_commit: 849c1d9652b5304dc8874e0060120b8378a36c74
---

# Assign stable requirement IDs

## Intent

Assign stable requirement IDs

## Affected Canonical Specs

- None

## Acceptance Criteria

- Every durable requirement has a unique REQ ID; existing requirement semantics remain unchanged; SpecSync strict validation passes

## No-spec Rationale

Add stable identifiers to existing requirement statements without changing their semantics.

## Migration Note

Migrated by hand to SpecSync 6 per Leif's decision (2026-09-28); the 6.0.0 tool refused to archive this legacy record (`` exact-only delivery input `specs/loader-swift/loader-swift.spec.md` changed after acceptance and requires an audited reopen; run `specsync change reopen CHG-0002-assign-stable-requirement-ids` to re-verify the accepted change, or supersede it from a later change under a module granted the path by `owns` in `.specsync/config.toml` ``).

- Workflow v1 (SpecSync 5) record, accepted on 2026-07-13 by the closing approval already stored in `approvals.json`. SpecSync 6.0.0 reports its accepted evidence as stale, for the reason quoted above.
- Moved by hand from `.specsync/changes/CHG-0002-assign-stable-requirement-ids/` into the layout `specsync change archive` writes: `accepted-state.json` is the unchanged accepted `state.json`, `state.json` is marked `archived`, and this file's front matter says `archived`.
- `approvals.json`, `verification.json` and every other artifact are the original SpecSync 5 evidence, unchanged. `verification.json` verifies commit `bf380d2e59d02277427b516d6577395d9d7aaa02`, not the tree this record was archived from.
- There is no `verification-attempts.json`: SpecSync 5 did not write one for this record, and this migration does not invent attempt history.
- This migration added no verification evidence, test result, attempt history, or approval. It is a manual migration, not a fresh re-verification.
- Closing it through the tool takes `specsync change reopen`, `specsync change verify`, then `specsync change accept`, which writes a new closing approval. Per Leif's decision it was archived by hand instead, so no reopen or new approval is recorded.
