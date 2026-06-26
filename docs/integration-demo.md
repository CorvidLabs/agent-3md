# agent.3md over MCP - integration demo

An orchestrator drives the `agent.3md` MCP server (`src/mcp.ts`) over stdio.
For each request it calls `route_skill` to pick a skill, `get_skill` to load
only that skill's plane, then fills the skill's bound command template with typed
inputs to produce the exact command that would run. Nothing is executed here;
`bun run src/cli.ts run ... --exec` is what actually runs a command.

Run it: `bun src/integration-demo.ts`

```
agent.3md  x  MCP  -  route -> load -> fill -> command (over the MCP round-trip)
====================================================================
connected: agent-3md:dev  (proto 2024-11-05)

> find every TODO in src
  MCP route_skill  -> search  (score 1; matched: find)
  MCP get_skill search  -> loaded 38 tokens (only this plane)
  FILL search  -> rg --line-number 'TODO' 'src'

> parse the version field from package.json
  MCP route_skill  -> json  (score 3; matched: json, field, parse)
  MCP get_skill json  -> loaded 29 tokens (only this plane)
  FILL json  -> jq '.version' 'package.json'

> show the open prs
  MCP route_skill  -> pr  (score 1; matched: open prs)
  MCP get_skill pr  -> loaded 35 tokens (only this plane)
  FILL pr  -> gh pr list --state 'open'

====================================================================
Every turn: the agent.3md MCP server chose the skill and served only its
plane; the runner filled its bound command. Nothing ran; the commands above
are the exact strings `bun run src/cli.ts run ... --exec` would execute.
```
