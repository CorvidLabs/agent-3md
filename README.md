# agent-3md

**One 3md file is an entire agent.** Plane 0 is the agent (identity, rules);
every other plane is a skill. The document's frontmatter is the manifest, each
plane's attributes (`triggers=`, `inputs=`, `cost=`) are the queryable index,
and `[[z=N|..]]` links are skill dependencies.

The runtime parses the file once (canonical 3md parser, vendored), builds an
index, and then:

- **routes** free text to the best skill via a trigger index (microseconds),
- **fetches** a single skill's body on demand — *progressive disclosure*, you
  load only the plane you need, not the whole agent,
- **resolves** a skill's dependency chain via its cross-plane links.

```
bun run demo
```

Why 3md fits agents: one artifact that is human-readable docs *and* a
machine-queryable skill index, with addressable records (planes), a typed header
(frontmatter), and explicit skill graph (links). Editing the agent = editing one
plain-text file; the skills can't drift from the index because they're the same
bytes.
