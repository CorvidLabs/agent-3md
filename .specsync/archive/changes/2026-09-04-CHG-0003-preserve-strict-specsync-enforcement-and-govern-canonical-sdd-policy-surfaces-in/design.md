---
change: CHG-0003-preserve-strict-specsync-enforcement-and-govern-canonical-sdd-policy-surfaces-in
artifact: design
---

# Design

Keep Trust on the rollout's standard profile so provenance remains progressive.
Place strict SpecSync validation in a dedicated Fledge Trust lifecycle lane,
before native checks, while retaining a native-only SDD verification lane so an
implementing change does not recursively require its own closing evidence. Set
Trust's independent coverage floor to 100 percent. Exclude only
transient SpecSync change workspaces, locks, and caches from meaningful-path
enforcement; canonical specs and committed policy files remain governed.
