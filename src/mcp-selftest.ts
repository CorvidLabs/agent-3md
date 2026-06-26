// Spawn the MCP server as a child process, speak JSON-RPC to it over stdio, and
// print the responses — proof that any MCP client can drive an agent.3md.
import { fileURLToPath } from "node:url";

const mcpPath = fileURLToPath(new URL("./mcp.ts", import.meta.url));
const agentPath = fileURLToPath(new URL("../agent.3md", import.meta.url));

const proc = Bun.spawn(["bun", mcpPath, agentPath], { stdin: "pipe", stdout: "pipe", stderr: "inherit" });

const requests = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {} } },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
  { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "route_skill", arguments: { text: "review my diff before the PR" } } },
  { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_skill", arguments: { name: "sql-query" } } },
  { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_skills" } },
];

for (const r of requests) proc.stdin.write(JSON.stringify(r) + "\n");
proc.stdin.flush();
proc.stdin.end();

const want = requests.length;
const got = new Map<number, any>();
const decoder = new TextDecoder();
let buf = "";
for await (const chunk of proc.stdout) {
  buf += decoder.decode(chunk);
  let nl: number;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (line) { const m = JSON.parse(line); got.set(m.id, m); }
  }
  if (got.size >= want) break;
}

const show = (id: number, label: string, pick: (m: any) => string) =>
  console.log(`\n[id ${id}] ${label}\n  ${pick(got.get(id)).split("\n").join("\n  ")}`);

console.log("MCP SELFTEST — client <-> server over stdio JSON-RPC");
console.log("=".repeat(60));
show(1, "initialize", (m) => `${m.result.serverInfo.name}  proto=${m.result.protocolVersion}`);
show(2, "tools/list", (m) => m.result.tools.map((t: any) => `${t.name}(${Object.keys(t.inputSchema.properties).join(",")})`).join("\n"));
show(3, "tools/call route_skill 'review my diff before the PR'", (m) => m.result.content[0].text);
show(4, "tools/call get_skill 'sql-query'", (m) => m.result.content[0].text);
show(5, "tools/call list_skills", (m) => m.result.content[0].text);

const allOk = [1, 2, 3, 4, 5].every((id) => got.has(id) && !got.get(id).error);
console.log("\n" + "=".repeat(60));
console.log(allOk ? "ALL 5 REQUESTS ANSWERED ✓" : "MISSING/ERROR RESPONSES ✗");
await proc.exited;
process.exit(allOk ? 0 : 1);
