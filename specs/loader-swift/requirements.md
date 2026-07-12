---
spec: loader-swift.spec.md
---

## User Stories

- As an iOS or macOS developer, I want a native Swift package to load and query agent configurations.

## Acceptance Criteria

### REQ-loader-swift-001

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Provide `Agent`, `Skill`, and `SkillInput` types conforming to `Sendable`.
### REQ-loader-swift-002

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Mirror routing, inputs, and commands exactly.
### REQ-loader-swift-003

The implementation SHALL satisfy this requirement.

Acceptance Criteria

- Build via SwiftPM manifest.

## Constraints

- Support Swift 6 concurrency rules.

## Out of Scope

- Custom UI components.
