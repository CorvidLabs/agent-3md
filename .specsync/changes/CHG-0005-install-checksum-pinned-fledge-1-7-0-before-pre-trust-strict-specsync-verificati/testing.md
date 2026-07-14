---
change: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
artifact: testing
---

# Testing

- Confirm the workflow URL, Fledge version, architecture, and SHA-256 exactly
  match the immutable Trust 1.0.0 action's macOS ARM64 dependency.
- Run strict SpecSync at 100 percent and the complete native lane locally.
- Run Trust doctor and committed-range Trust verification.
- Require exact-head hosted SpecSync, Trust, and CodeQL checks to pass.
