---
change: CHG-0003-preserve-strict-specsync-enforcement-and-govern-canonical-sdd-policy-surfaces-in
artifact: research
---

# Research

Trust 1.0.0 derives SpecSync strictness from the strict Trust profile. Switching
the repository to that profile would also make provenance enforcing, contrary to
the rollout's progressive-provenance requirement. A strict SpecSync task in the
existing lifecycle lane preserves the former contract behavior independently.
SpecSync meaningful-path exclusions are prefix-based, so ignoring `.specsync/`
or `specs/` exempts the very policy and contract files named as meaningful.
