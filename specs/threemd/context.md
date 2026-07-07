---
spec: threemd.spec.md
---

## Context

The threemd module parses three-dimensional markdown (3md) documents, splitting the document by horizontal rules (planes) and parsing attributes out of the markdown headings.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Consumes parsed planes to index skills.

## Design Decisions

- **Markdown-First**: Keep parsing logic lightweight and focused solely on headers and horizontal rules.
