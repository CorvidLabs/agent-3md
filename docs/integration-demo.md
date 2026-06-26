# agent.3md over MCP - integration demo

An orchestrator drives the `agent.3md` MCP server (`src/mcp.ts`) over stdio.
For each request it calls `route_skill` to pick a skill, `get_skill` to load
only that skill's plane, then executes it with a real handler. `sql-query` runs
a live query against an in-memory database; `summarize` runs for real.

Run it: `bun src/integration-demo.ts`

```
agent.3md  x  MCP  -  route -> load -> execute (all over the MCP round-trip)
====================================================================
connected: agent-3md:Atlas  (proto 2024-11-05)

> what rows in the orders table have a null total?
  MCP route_skill  -> sql-query  (score 2; matched: rows, table)
  MCP get_skill sql-query  -> loaded 61 tokens (only this plane)
  EXECUTE sql-query  -> SELECT id,customer,total FROM orders WHERE total IS NULL  ->  [{"id":2,"customer":"Sol","total":null},{"id":4,"customer":"Vex","total":null}]

> summarize this for me
  MCP route_skill  -> summarize  (score 1; matched: summarize)
  MCP get_skill summarize  -> loaded 39 tokens (only this plane)
  EXECUTE summarize  -> 3md is a plain-text format that adds one named Z axis to Markdown.
  - A document is a stack of planes along that axis.
  - The same file is human-readable and machine-queryable.

> review my diff before the PR
  MCP route_skill  -> code-review  (score 3; matched: review, diff, pr)
  MCP get_skill code-review  -> loaded 68 tokens (only this plane)
  EXECUTE code-review  -> [stub] would review the diff for correctness/security/style (tools: fs)

====================================================================
Every turn: the agent.3md MCP server chose the skill and served only its
plane; the orchestrator executed it. The SQL result above is a live query.
```
