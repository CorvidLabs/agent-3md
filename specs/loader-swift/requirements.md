---
spec: loader-swift.spec.md
---

## User Stories

- As an iOS or macOS developer, I want a native Swift package to load and query agent configurations.

## Acceptance Criteria

- Provide `Agent`, `Skill`, and `SkillInput` types conforming to `Sendable`.
- Mirror routing, inputs, and commands exactly.
- Build via SwiftPM manifest.

## Constraints

- Support Swift 6 concurrency rules.

## Out of Scope

- Custom UI components.
