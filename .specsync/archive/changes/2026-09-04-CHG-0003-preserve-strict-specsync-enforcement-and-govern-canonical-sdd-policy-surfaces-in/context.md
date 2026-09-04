---
change: CHG-0003-preserve-strict-specsync-enforcement-and-govern-canonical-sdd-policy-surfaces-in
artifact: context
---

# Context

The previous standalone SpecSync workflow treated warnings as failures. Trust's
standard profile intentionally keeps provenance progressive, but its composed
contract invocation is not strict. The migration must therefore retain strict
contract validation in the lifecycle lane. The adopted SDD policy also ignored
all canonical specs and all `.specsync` files, which made its meaningful-path
rules ineffective for those governed surfaces.
