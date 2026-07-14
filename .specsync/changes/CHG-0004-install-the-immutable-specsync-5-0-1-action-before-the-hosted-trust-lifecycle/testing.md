---
change: CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle
artifact: testing
---

# Testing

- Validate the workflow and immutable SpecSync commit and requested version.
- Run strict SpecSync at 100 percent locally.
- Run the complete native TypeScript, typed-build, Rust, and Swift lane.
- Run Trust doctor and committed-range Trust verification.
- Require hosted Trust and CodeQL to pass on the exact pushed head.
