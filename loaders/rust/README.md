# agent3md

A fast native CLI over any `agent.3md` file: a whole agent and all of its skills
packed into a single plain-text [3md](https://corvidlabs.xyz/3md) document. Plane 0
is the agent, every other plane is a skill, and this tool routes a request to the
right skill, prints it, resolves its dependency chain, and validates the file
against the `agent3md/1` spec.

It is the native counterpart to the TypeScript reference loader
(`@corvidlabs/agent3md`), built on the canonical `threemd` parser so its routing
and validation behave identically across languages.

## Install

```sh
cargo install agent3md
```

## Use

```sh
agent3md manifest agent.3md            # agent name/model/tools + skill catalog
agent3md skills   agent.3md            # just the skill names
agent3md route    agent.3md "review my diff"   # rank matching skills + load chain
agent3md get      agent.3md sql-query  # print one skill body (progressive disclosure)
agent3md resolve  agent.3md web-research       # a skill plus its dependency chain
agent3md validate agent.3md            # check against agent3md/1 (exit 1 on errors)
```

If you omit the file, the CLI looks for `agent.3md` in the current directory.

## What it is

`agent3md` is a proposed convention, not yet a finished standard. The format, the
spec, the validator, the MCP server, and loaders in TypeScript, Rust, and Swift
all live at [github.com/CorvidLabs/agent-3md](https://github.com/CorvidLabs/agent-3md).

MIT licensed.
