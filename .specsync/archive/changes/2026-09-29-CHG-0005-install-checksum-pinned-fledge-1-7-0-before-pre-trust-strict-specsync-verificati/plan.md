---
change: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
artifact: plan
---

# Plan

1. Download the same Fledge 1.7.0 macOS ARM64 release asset used by Trust.
2. Verify the asset against Trust's embedded SHA-256 before execution.
3. Add the verified binary to `GITHUB_PATH` before the strict SpecSync action.
4. Preserve the strict SpecSync and immutable Trust steps unchanged, then require
   the exact corrected hosted head to pass.
