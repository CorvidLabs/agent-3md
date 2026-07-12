---
spec: threemd.spec.md
---

## User Stories

- As a loader, I want to parse a 3md string into structured planes and metadata.

## Durable Requirements

### REQ-threemd-001

The implementation SHALL split documents on horizontal rules (`---`).

Acceptance Criteria

- Split documents on horizontal rules (`---`).

### REQ-threemd-002

The implementation SHALL extract key-value frontmatter attributes.

Acceptance Criteria

- Extract key-value frontmatter attributes.

### REQ-threemd-003

The implementation SHALL parse plane headers to extract attributes like `kind`, `z`, and `label`.

Acceptance Criteria

- Parse plane headers to extract attributes like `kind`, `z`, and `label`.

## Acceptance Criteria

- Split documents on horizontal rules (`---`).
- Extract key-value frontmatter attributes.
- Parse plane headers to extract attributes like `kind`, `z`, and `label`.

## Constraints

- Follow standard Markdown spec for horizontal rule syntax.

## Out of Scope

- Rendering markdown to HTML or PDF.
