---
change: CHG-0003-preserve-strict-specsync-enforcement-and-govern-canonical-sdd-policy-surfaces-in
artifact: testing
---

# Testing

- Run `specsync check --strict --force --require-coverage 100` and require zero
  errors, warnings, or stale companions.
- Run `fledge lanes run verify` for the TypeScript, typed-build, Rust, and Swift
  verification used as non-circular SDD evidence.
- Run `fledge lanes run trust` after lifecycle acceptance to prove strict
  SpecSync executes before the same native checks.
- Confirm all four agent integrations remain installed.
- Run Trust doctor and committed-range Trust verification.
- Confirm the final diff contains no product-source changes.
