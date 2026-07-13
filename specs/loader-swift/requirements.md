---
spec: loader-swift.spec.md
---

## User Stories

- As an iOS or macOS developer, I want a native Swift package to load and query agent configurations.

## Acceptance Criteria

### REQ-loader-swift-001

The Swift loader SHALL provide `Agent`, `Skill`, and `SkillInput` as `Sendable` types.

Acceptance Criteria

- Provide `Agent`, `Skill`, and `SkillInput` types conforming to `Sendable`.

### REQ-loader-swift-002

The Swift loader SHALL mirror reference routing, input, and command behavior.

Acceptance Criteria

- Mirror routing, inputs, and commands exactly.

### REQ-loader-swift-003

The Swift loader SHALL build through its SwiftPM manifest.

Acceptance Criteria

- Build via SwiftPM manifest.

## Constraints

- Support Swift 6 concurrency rules.

## Out of Scope

- Custom UI components.
