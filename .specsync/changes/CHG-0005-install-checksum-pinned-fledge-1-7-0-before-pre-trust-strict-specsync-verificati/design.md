---
change: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
artifact: design
---

# Design

Install only the platform asset required by the preserved `macos-15` runner.
Fail closed on download or checksum mismatch, make the verified executable
available to subsequent steps, and leave Trust's own dependency installation
and policy enforcement untouched.
