---
spec: runtime.spec.md
---

## Context

The runtime module is the core of the agent-3md reference implementation. It allows AI orchestration systems to load and execute skills dynamically without feeding the entire agent.3md file into the context window at once (progressive disclosure).

## Related Modules

- [threemd.spec.md](../threemd/threemd.spec.md): Parses the raw markdown planes.
- [validation.spec.md](../validation/validation.spec.md): Validates the loaded document structure before execution.

## Design Decisions

- **Lazy Loading**: Plane bodies are fetched on demand to conserve LLM context tokens.
- **Triggers**: Tokenized maximally using Unicode word boundaries to keep matching behavior consistent between TypeScript, Rust, and Swift ports.
