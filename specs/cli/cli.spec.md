---
module: cli
version: 1
status: draft
files:
  - src/cli.ts

db_tables: []
depends_on: [runtime]
---

# CLI

## Purpose

`cli` is the reference command-line tool over any `agent.3md` file. It exposes
the runtime's route / load / fill / command loop from a terminal, so an operator
can inspect a packaged agent and turn a free-text request into a concrete
shell command. It also scaffolds a fresh, valid agent with `new`. The Rust
loader (`loaders/rust/src/main.rs`) mirrors these commands, so the TS CLI is the
behavioral reference for the cross-language tool. It is a script, not a library:
it has no exports and runs its command dispatch at module load.

## Public API

### Exported Functions

| Export | Description |
|--------|-------------|
| (none) | Executable script; the public surface is its command-line grammar, not TypeScript exports. |

### Structs & Enums

| Type | Description |
|------|-------------|
| (none) | Uses `Agent` and `commandPlaceholders` from the runtime; defines no exported types. |

### Traits

| Trait | Description |
|-------|-------------|
| (none) | Command-line entry point. |

### Functions

| Command | Usage | Description |
|---------|-------|-------------|
| `new` | `new <name> [outfile]` | Scaffold a fresh valid `agent.3md` (identity plane plus example skills) to `<slug>.3md` or `outfile`; refuses to overwrite. |
| `manifest` | `manifest [file]` | Print the agent name, optional model, persona, tools, and the skill catalog (names, cost, tool, triggers) with no bodies. |
| `skills` | `skills [file]` | Print just the skill names, one per line. |
| `route` | `route [file] <text>` | Rank the skills matching the request and print the load chain of the top match. |
| `get` | `get [file] <skill>` | Print one skill's metadata header and full body (progressive disclosure). |
| `resolve` | `resolve [file] <skill>` | Print a skill plus its transitive dependency chain. |
| `run` | `run [file] <text> [k=v ...] [--exec]` | Route the request, fill the top skill's command from `k=v` inputs, print it, and with `--exec` run it. |

## Invariants

1. The first argument is the command; `help`, `-h`, `--help`, or no command prints usage and exits 0.
2. `file` is optional and defaults to the packaged `../agent.3md`. A leading argument is treated as the file only when it ends in `.3md` or already exists on disk; otherwise it is part of the request or skill name.
3. Loading a missing file, or asking for an unknown skill, prints an error with the usage block and exits non-zero.
4. `new` slugifies the name (lowercasing, collapsing non-alphanumeric runs to `-`), writes the scaffold, and refuses to overwrite an existing output file. The scaffold it emits is a valid agent3md/1 document.
5. `route` and `run` print `no skill matched` (and exit 0) when nothing matches, rather than erroring.
6. `run` splits its trailing arguments into `key=value` inputs (keys matching `[A-Za-z_]\w*`) and free-text request words; the request routes to the top skill and its command is filled from the collected values.
7. A skill with no bound `tool` is treated as guidance: `run` prints the body instead of a command.
8. `--exec` runs the filled command through the shell inheriting stdio and exits with its status; it refuses to run (and fails) while any placeholder is still unfilled.

## Behavioral Examples

```
Given the packaged agent.3md and a "search" skill bound to rg
When "run \"find every TODO\" pattern=TODO path=src" is invoked
Then it routes to search, prints the filled rg command, and (without --exec) does not run it
```

```
Given no leading argument that ends in .3md or exists on disk
When "route summarize this thread" is invoked
Then the words are treated as the request and the default ../agent.3md is loaded
```

```
Given "new my agent"
When invoked with no existing my-agent.3md
Then it writes my-agent.3md with an identity plane plus example skills and prints follow-up commands
```

## Error Cases

| Error | When | Behavior |
|-------|------|----------|
| missing request | `route` / `run` is given no request text | Prints an error plus usage and exits 1. |
| missing name | `new`, `get`, or `resolve` is missing its required name argument | Prints an error plus usage and exits 1. |
| no such file | the resolved `file` does not exist | Prints `no such file` plus usage and exits 1. |
| no such skill | `get` / `resolve` names a skill with no plane | Prints `no such skill` plus usage and exits 1. |
| refuse overwrite | `new` targets an output file that already exists | Prints a refusal plus usage and exits 1. |
| unfilled `--exec` | `run --exec` still has unfilled placeholders | Prints the missing inputs plus usage and exits 1. |
| unknown command | the command is not one of the known verbs | Prints `unknown command` plus usage and exits 1. |

## Dependencies

- `./runtime` - `Agent` (parse / manifest / route / get / resolve / command) and `commandPlaceholders` (to detect still-unfilled inputs).
- `node:fs`, `node:url`, and (only under `--exec`) `node:child_process` for file access and shell execution.

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1 | 2026-07-06 | Initial spec for the reference CLI (`new`, `manifest`, `skills`, `route`, `get`, `resolve`, `run`). |
</content>
