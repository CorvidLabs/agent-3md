---
change: run-the-specsync-archive-gate-before-every-ci-job
artifact: plan
---

# Plan

## Approach

Add one `archive-gate` job, displayed as `Archive`, at the top of `jobs:` in each
workflow that runs on pull requests or pushes, and make every other job depend on
it. The gate checks out the pull request head (or the pushed commit) without
persisting credentials and runs the spec-sync action pinned to
106aaa43d0bcf049f19b173ddb63815a25c3f931 with `archive-gate-only: 'true'`.

## Out of scope

- `publish.yml`, which runs only on release publication and manual dispatch.
- The existing accepted changes CHG-0001 to CHG-0005 and their stale verification.
- Branch protection, which an org ruleset requiring `Archive` configures.
- Moving the pin to a release tag, which waits for the first release with the gate.

## Steps

1. `trust.yml`: add `archive-gate` on `ubuntu-latest` using the workflow's existing
   `actions/checkout@v4`, and add `needs: archive-gate` to the `trust` job.
2. `atlas.yml`: add `archive-gate` on `ubuntu-latest` using the workflow's existing
   `actions/checkout@v5`, and add `needs: archive-gate` to the `atlas` job;
   `deploy` already needs `atlas`, so it depends on the gate transitively.
3. Leave every other line of both workflows unchanged.

## Risks

- While any change stays open on `main`, pushes to `main` skip the trust gate and
  the atlas Pages deploy. This is intended: archiving the change unblocks them.
- The pin is a commit, not a release; it must be bumped deliberately later.

## Constraints consulted

- AGENTS.md trust toolchain block: the Trust gate, strict SpecSync gate and the
  managed AGENTS.md block are kept in place unchanged; nothing is bypassed or
  weakened, the gate only runs before them.
- AGENTS.md: keep module specs synchronized; no source module changes here, so no
  spec text changes are needed.
