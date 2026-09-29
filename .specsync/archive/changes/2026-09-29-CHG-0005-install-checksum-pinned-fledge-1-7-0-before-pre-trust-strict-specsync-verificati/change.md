---
id: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
state: archived
type: migration
base_commit: d117474faec9d8e916c57f118d841c6adc6f9765
---

# Install checksum-pinned Fledge 1.7.0 before pre-Trust strict SpecSync verification

## Intent

Install checksum-pinned Fledge 1.7.0 before pre-Trust strict SpecSync verification

## Affected Canonical Specs

- None

## Acceptance Criteria

- The macOS ARM64 workflow downloads Fledge 1.7.0 from its immutable release URL
- verifies SHA-256 21d0916d52ef14e6d33e3967417773369e047a0311e66bbb1eecc8f69332a040
- exposes it through GITHUB_PATH before SpecSync
- and exact-head hosted Trust passes

## No-spec Rationale

This hosted-runner dependency setup allows the already-approved native verification command to run before Trust and does not alter Agent 3MD product behavior or canonical contracts.

## Migration Note

Migrated by hand to SpecSync 6 per Leif's decision (2026-09-28); the 6.0.0 tool refused to archive this legacy record (`` exact-only delivery input `.github/workflows/trust.yml` changed after acceptance and requires an audited reopen; run `specsync change reopen CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati` to re-verify the accepted change, or supersede it from a later change under a module granted the path by `owns` in `.specsync/config.toml` ``).

- Workflow v1 (SpecSync 5) record, accepted on 2026-07-14 by the closing approval already stored in `approvals.json`. SpecSync 6.0.0 reports its accepted evidence as stale, for the reason quoted above.
- Moved by hand from `.specsync/changes/CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati/` into the layout `specsync change archive` writes: `accepted-state.json` is the unchanged accepted `state.json`, `state.json` is marked `archived`, and this file's front matter says `archived`.
- `approvals.json`, `verification.json` and every other artifact are the original SpecSync 5 evidence, unchanged. `verification.json` verifies commit `d117474faec9d8e916c57f118d841c6adc6f9765`, not the tree this record was archived from.
- There is no `verification-attempts.json`: SpecSync 5 did not write one for this record, and this migration does not invent attempt history.
- This migration added no verification evidence, test result, attempt history, or approval. It is a manual migration, not a fresh re-verification.
- Closing it through the tool takes `specsync change reopen`, `specsync change verify`, then `specsync change accept`, which writes a new closing approval. Per Leif's decision it was archived by hand instead, so no reopen or new approval is recorded.
