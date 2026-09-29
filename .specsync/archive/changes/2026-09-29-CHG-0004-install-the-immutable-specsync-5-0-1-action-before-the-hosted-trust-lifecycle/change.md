---
id: CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle
state: archived
type: migration
base_commit: ffe2ad05876665501b0c39560c2c4063396dc806
---

# Install the immutable SpecSync 5.0.1 action before the hosted Trust lifecycle

## Intent

Install the immutable SpecSync 5.0.1 action before the hosted Trust lifecycle

## Affected Canonical Specs

- None

## Acceptance Criteria

- The hosted workflow pins the SpecSync 5.0.1 action to commit 59bbfa766c6cce01ab815ab47db195b0629cc014 before Trust
- runs strict forced validation at 100 percent
- exposes the binary to the Trust lifecycle
- and exact-head hosted Trust passes without product changes

## No-spec Rationale

This hosted-runner setup correction makes the approved strict governance lifecycle executable and does not change Agent 3MD runtime behavior or canonical contracts.

## Migration Note

Migrated by hand to SpecSync 6 per Leif's decision (2026-09-28); the 6.0.0 tool refused to archive this legacy record (`` exact-only delivery input `.github/workflows/trust.yml` changed after acceptance and requires an audited reopen; run `specsync change reopen CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle` to re-verify the accepted change, or supersede it from a later change under a module granted the path by `owns` in `.specsync/config.toml` ``).

- Workflow v1 (SpecSync 5) record, accepted on 2026-07-14 by the closing approval already stored in `approvals.json`. SpecSync 6.0.0 reports its accepted evidence as stale, for the reason quoted above.
- Moved by hand from `.specsync/changes/CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle/` into the layout `specsync change archive` writes: `accepted-state.json` is the unchanged accepted `state.json`, `state.json` is marked `archived`, and this file's front matter says `archived`.
- `approvals.json`, `verification.json` and every other artifact are the original SpecSync 5 evidence, unchanged. `verification.json` verifies commit `d117474faec9d8e916c57f118d841c6adc6f9765`, not the tree this record was archived from.
- There is no `verification-attempts.json`: SpecSync 5 did not write one for this record, and this migration does not invent attempt history.
- This migration added no verification evidence, test result, attempt history, or approval. It is a manual migration, not a fresh re-verification.
- Closing it through the tool takes `specsync change reopen`, `specsync change verify`, then `specsync change accept`, which writes a new closing approval. Per Leif's decision it was archived by hand instead, so no reopen or new approval is recorded.
