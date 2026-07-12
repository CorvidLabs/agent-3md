---
spec: loader-rust.spec.md
---

## User Stories

- As a Rust developer, I want a fast binary to validate and execute agents without Node/Bun.

## Durable Requirements

### REQ-loader-rust-001

The implementation SHALL parse 3md structures using native Rust structures.

Acceptance Criteria

- Parse 3md structures using native Rust structures.

### REQ-loader-rust-002

The implementation SHALL implement matching trigger routing logic.

Acceptance Criteria

- Implement matching trigger routing logic.

### REQ-loader-rust-003

The implementation SHALL mirror validation rules exactly.

Acceptance Criteria

- Mirror validation rules exactly.

## Acceptance Criteria

- Parse 3md structures using native Rust structures.
- Implement matching trigger routing logic.
- Mirror validation rules exactly.

## Constraints

- Must compile on stable Cargo rustc.

## Out of Scope

- Implementing an MCP stdio server in Rust.
