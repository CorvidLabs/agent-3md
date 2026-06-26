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
// Robustness probes: a malformed (non-JSON) line, a request with an invalid
// (object) id, then a normal request to prove the server is still alive.
proc.stdin.write("this is not json at all\n");
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: { bad: true }, method: "ping" }) + "\n");
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 6, method: "ping" }) + "\n");
proc.stdin.flush();
proc.stdin.end();

const got = new Map<number, any>();
const errsNullId: any[] = []; // parse-error / invalid-request responses (id: null)
const decoder = new TextDecoder();
let buf = "";
for await (const chunk of proc.stdout) {
  buf += decoder.decode(chunk);
  let nl: number;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const m = JSON.parse(line);
    if (m.id === null) errsNullId.push(m);
    else got.set(m.id, m);
  }
  if (got.has(6)) break; // the post-garbage liveness request came back
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

console.log("\n--- robustness guards ---");
const parseErr = errsNullId.find((m) => m.error?.code === -32700);
const badId = errsNullId.find((m) => m.error?.code === -32600);
const alive = got.get(6) && !got.get(6).error;
console.log(`  malformed line      -> ${parseErr ? "parse error -32700 (id null) ✓" : "NOT HANDLED ✗"}`);
console.log(`  invalid id (object) -> ${badId ? "invalid request -32600 (id null), bad id not echoed ✓" : "NOT HANDLED ✗"}`);
console.log(`  server still alive  -> ${alive ? "ping id=6 answered ✓" : "DEAD ✗"}`);

const normalsOk = [1, 2, 3, 4, 5].every((id) => got.has(id) && !got.get(id).error);
const guardsOk = !!parseErr && !!badId && !!alive;
console.log("\n" + "=".repeat(60));
console.log(normalsOk && guardsOk ? "ALL REQUESTS ANSWERED + GUARDS HOLD ✓" : "MISSING/ERROR RESPONSES ✗");
await proc.exited;
process.exit(normalsOk && guardsOk ? 0 : 1);
