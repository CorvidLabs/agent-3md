---
spec: cli.spec.md
---

## Context

The cli module provides a command-line interface for operators to inspect, route, and execute skills packaged in an agent.3md file directly from the terminal.

## Related Modules

- [runtime.spec.md](../runtime/runtime.spec.md): Backs CLI commands with runtime queries.

## Design Decisions

- **Zero-Dependency CLI Parsing**: Use basic node process argument parsing to avoid third-party dependencies.
