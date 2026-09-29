---
change: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
artifact: research
---

# Research

The immutable Trust action maps macOS ARM64 to `fledge-macos-aarch64` at Fledge
1.7.0 and verifies SHA-256
`21d0916d52ef14e6d33e3967417773369e047a0311e66bbb1eecc8f69332a040`.
The hosted runner and SpecSync action both reported macOS ARM64, so the same
immutable dependency is appropriate for the pre-Trust verification phase.
