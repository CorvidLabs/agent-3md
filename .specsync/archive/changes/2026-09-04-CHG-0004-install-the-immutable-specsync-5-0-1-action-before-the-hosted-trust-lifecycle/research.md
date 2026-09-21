---
change: CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle
artifact: research
---

# Research

The SpecSync 5.0.1 composite action downloads the requested release, verifies
its checksum, appends its install directory to `GITHUB_PATH`, and then runs the
configured strict check. GitHub makes that path available to subsequent steps,
so Trust's lifecycle can use the same immutable binary without a mutable install.
