---
spec: threemd.spec.md
---

## User Stories

- As a loader, I want to parse a 3md string into structured planes and metadata.

## Acceptance Criteria

### REQ-threemd-001

The parser SHALL split 3md documents on Markdown horizontal rules.

Acceptance Criteria

- Split documents on horizontal rules (`---`).

### REQ-threemd-002

The parser SHALL extract key-value frontmatter attributes.

Acceptance Criteria

- Extract key-value frontmatter attributes.

### REQ-threemd-003

The parser SHALL extract `kind`, `z`, `label`, and other attributes from plane headers.

Acceptance Criteria

- Parse plane headers to extract attributes like `kind`, `z`, and `label`.

## Constraints

- Follow standard Markdown spec for horizontal rule syntax.

## Out of Scope

- Rendering markdown to HTML or PDF.
