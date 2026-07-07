---
spec: loader-rust.spec.md
---

## User Stories

- As a Rust developer, I want a fast binary to validate and execute agents without Node/Bun.

## Acceptance Criteria

- Parse 3md structures using native Rust structures.
- Implement matching trigger routing logic.
- Mirror validation rules exactly.

## Constraints

- Must compile on stable Cargo rustc.

## Out of Scope

- Implementing an MCP stdio server in Rust.
