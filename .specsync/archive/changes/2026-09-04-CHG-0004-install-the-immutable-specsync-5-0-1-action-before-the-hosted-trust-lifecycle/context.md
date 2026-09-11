---
change: CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle
artifact: context
---

# Context

The Trust 1.0.0 action invokes the configured lifecycle before its own contract
layer installs SpecSync. The exact hosted head therefore failed at the first
strict lifecycle task with `specsync: command not found`, although the same
strict, native, and committed-range checks passed locally.
