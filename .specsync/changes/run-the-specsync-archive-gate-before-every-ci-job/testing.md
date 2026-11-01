---
change: run-the-specsync-archive-gate-before-every-ci-job
artifact: testing
---

# Testing

- Both edited workflows parse with Ruby Psych `safe_load`, and the printed job
  graph shows `archive-gate` with no needs, `trust` and `atlas` needing
  `archive-gate`, and `deploy` needing `atlas`.
- `bash .github/scripts/archive-readiness.sh .` from spec-sync at the pinned
  commit fails, as expected, because CHG-0001 to CHG-0005 and this change are
  still open; once they are archived it passes.
- `specsync change audit --strict` and `specsync check --strict` are run locally;
  the stale-verification errors for CHG-0001, CHG-0002, CHG-0004 and CHG-0005
  already exist on `main` and are not introduced here.
- In CI, the `Archive` check on the pull request runs first and every other job
  waits for it.
