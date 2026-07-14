---
spec: loader-rust.spec.md
---

## User Stories

- As a Rust developer, I want a fast binary to validate and execute agents without Node/Bun.

## Acceptance Criteria

### REQ-loader-rust-001

The Rust loader SHALL parse 3md documents into native Rust structures.

Acceptance Criteria

- Parse 3md structures using native Rust structures.

### REQ-loader-rust-002

The Rust loader SHALL implement the reference trigger-routing behavior.

Acceptance Criteria

- Implement matching trigger routing logic.

### REQ-loader-rust-003

The Rust loader SHALL mirror the reference validation rules exactly.

Acceptance Criteria

- Mirror validation rules exactly.

## Constraints

- Must compile on stable Cargo rustc.

## Out of Scope

- Implementing an MCP stdio server in Rust.
