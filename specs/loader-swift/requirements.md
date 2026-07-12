---
spec: loader-swift.spec.md
---

## User Stories

- As an iOS or macOS developer, I want a native Swift package to load and query agent configurations.

## Durable Requirements

### REQ-loader-swift-001

The implementation SHALL provide `Agent`, `Skill`, and `SkillInput` types conforming to `Sendable`.

Acceptance Criteria

- Provide `Agent`, `Skill`, and `SkillInput` types conforming to `Sendable`.

### REQ-loader-swift-002

The implementation SHALL mirror routing, inputs, and commands exactly.

Acceptance Criteria

- Mirror routing, inputs, and commands exactly.

### REQ-loader-swift-003

The implementation SHALL build via SwiftPM manifest.

Acceptance Criteria

- Build via SwiftPM manifest.

## Acceptance Criteria

- Provide `Agent`, `Skill`, and `SkillInput` types conforming to `Sendable`.
- Mirror routing, inputs, and commands exactly.
- Build via SwiftPM manifest.

## Constraints

- Support Swift 6 concurrency rules.

## Out of Scope

- Custom UI components.
