---
id: run-the-specsync-archive-gate-before-every-ci-job
state: approved
type: operations
base_commit: 52e02c57d2e6c016643f6129fd33c375b5c46599
---

# Run the SpecSync archive gate before every CI job

## Intent

Run the SpecSync archive gate before every CI job

## Affected Canonical Specs

- None

## Acceptance Criteria

- trust.yml and atlas.yml each start with an archive-gate job named Archive that runs CorvidLabs/spec-sync pinned to 106aaa43d0bcf049f19b173ddb63815a25c3f931 with archive-gate-only 'true'; every other job in those workflows needs archive-gate directly or transitively, so nothing else runs while a change under .specsync/changes/ is open.

## No-spec Rationale

CI workflow ordering only; no canonical spec owns .github/workflows
