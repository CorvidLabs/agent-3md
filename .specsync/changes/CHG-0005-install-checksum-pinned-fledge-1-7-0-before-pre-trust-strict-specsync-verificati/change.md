---
id: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
state: accepted
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
