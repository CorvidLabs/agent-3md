---
change: run-the-specsync-archive-gate-before-every-ci-job
artifact: context
---

# Context

This is part of the org-wide rollout of CorvidLabs/spec-sync#832, approved by
0xLeif. That pull request (merged as 106aaa43d0bcf049f19b173ddb63815a25c3f931)
added an archive gate to the spec-sync GitHub Action: with
`archive-gate-only: 'true'` it runs only `.github/scripts/archive-readiness.sh`
(bash and python3, no binary download) and fails while any change under
`.specsync/changes/` is still open. The goal is that every SpecSync change is
archived before a pull request merges, and that CI runs nothing else until it is.

Published spec-sync v6.1.1 and older ignore the new input, so the step pins the
merge commit instead of a release tag. It should move to the first release that
ships the gate.

Branch protection is configured separately through an org ruleset that requires
a check named `Archive`; a skipped job counts as passing, so merge blocking
relies on that ruleset rather than on the job graph alone.

At the time of this change, five earlier changes (CHG-0001 to CHG-0005) are
accepted but not archived on `main`, so the new Archive check stays red until
their owners archive them. This change does not touch them. `publish.yml` runs
only on releases and manual dispatch, so it is out of scope.
