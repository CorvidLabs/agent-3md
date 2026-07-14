---
change: CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle
artifact: design
---

# Design

Keep the unified Trust action as the required gate. Precede it with the direct,
immutable SpecSync 5.0.1 consumer because Trust 1.0.0 orders lifecycle before its
contract-layer installation. This both preserves the prior strict behavior and
provides the binary required by the repository's strict Trust lifecycle lane.
