---
change: CHG-0005-install-checksum-pinned-fledge-1-7-0-before-pre-trust-strict-specsync-verificati
artifact: context
---

# Context

The immutable SpecSync action now runs before Trust, but accepted lifecycle
evidence executes `fledge lanes run verify`. Trust installs Fledge only inside a
later composite step, so the exact hosted SpecSync check failed because Fledge
was not yet available. Local verification remained green.
