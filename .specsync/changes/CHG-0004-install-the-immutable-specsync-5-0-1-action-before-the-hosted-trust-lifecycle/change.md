---
id: CHG-0004-install-the-immutable-specsync-5-0-1-action-before-the-hosted-trust-lifecycle
state: accepted
type: migration
base_commit: ffe2ad05876665501b0c39560c2c4063396dc806
---

# Install the immutable SpecSync 5.0.1 action before the hosted Trust lifecycle

## Intent

Install the immutable SpecSync 5.0.1 action before the hosted Trust lifecycle

## Affected Canonical Specs

- None

## Acceptance Criteria

- The hosted workflow pins the SpecSync 5.0.1 action to commit 59bbfa766c6cce01ab815ab47db195b0629cc014 before Trust
- runs strict forced validation at 100 percent
- exposes the binary to the Trust lifecycle
- and exact-head hosted Trust passes without product changes

## No-spec Rationale

This hosted-runner setup correction makes the approved strict governance lifecycle executable and does not change Agent 3MD runtime behavior or canonical contracts.
