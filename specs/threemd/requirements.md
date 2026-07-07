---
spec: threemd.spec.md
---

## User Stories

- As a loader, I want to parse a 3md string into structured planes and metadata.

## Acceptance Criteria

- Split documents on horizontal rules (`---`).
- Extract key-value frontmatter attributes.
- Parse plane headers to extract attributes like `kind`, `z`, and `label`.

## Constraints

- Follow standard Markdown spec for horizontal rule syntax.

## Out of Scope

- Rendering markdown to HTML or PDF.
