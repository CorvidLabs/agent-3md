// End-to-end integration: an orchestrator (the "agent") handles user requests by
// driving the agent.3md MCP server over stdio. For each request it asks the
// server to ROUTE to a skill, then to GET only that skill's plane (progressive
// disclosure), reads the skill's bound command template from the manifest, and
// fills the runner's typed inputs into it - yielding the real command that would
// run. Nothing is executed; this is an honest route -> load -> fill -> command
// demo, consistent with src/run.ts but going through the MCP round-trip.
//
// Run: bun src/integration-demo.ts
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { Agent, fillCommand, commandPlaceholders } from "./runtime";

// --- a minimal persistent MCP client (newline-delimited JSON-RPC over stdio) ---
class McpClient {
  private proc;
  private pending = new Map<number, (m: any) => void>();
  private nextId = 1;
  private buf = "";
  constructor(cmd: string[]) {
    this.proc = Bun.spawn(cmd, { stdin: "pipe", stdout: "pipe", stderr: "inherit" });
    this.read();
  }
  private async read() {
    const dec = new TextDecoder();
    for await (const chunk of this.proc.stdout) {
      this.buf += dec.decode(chunk);
      let nl: number;
      while ((nl = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, nl).trim();
        this.buf = this.buf.slice(nl + 1);
        if (!line) continue;
        const m = JSON.parse(line);
        this.pending.get(m.id)?.(m);
        this.pending.delete(m.id);
      }
    }
  }
  call(method: string, params?: object): Promise<any> {
    const id = this.nextId++;
    const p = new Promise<any>((res) => this.pending.set(id, res));
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    this.proc.stdin.flush();
    return p;
  }
  async tool(name: string, args: object = {}): Promise<string> {
    const m = await this.call("tools/call", { name, arguments: args });
    return m.result.content[0].text as string;
  }
  close() { this.proc.stdin.end(); }
}

// The runner reads the same file to know each skill's bound command template
// (the MCP catalog carries `tool`); it supplies the typed input values.
const agentPath = fileURLToPath(new URL("../agent.3md", import.meta.url));
const local = new Agent(readFileSync(agentPath, "utf8"));

// --- the scenario ---
const out: string[] = [];
const log = (s = "") => { console.log(s); out.push(s); };

const mcpPath = fileURLToPath(new URL("./mcp.ts", import.meta.url));
const client = new McpClient(["bun", mcpPath, agentPath]);

const init = await client.call("initialize", { protocolVersion: "2024-11-05", capabilities: {} });
log("agent.3md  x  MCP  -  route -> load -> fill -> command (over the MCP round-trip)");
log("=".repeat(68));
log(`connected: ${init.result.serverInfo.name}  (proto ${init.result.protocolVersion})`);

const scenarios: { request: string; values: Record<string, string> }[] = [
  { request: "find every TODO in src", values: { pattern: "TODO", path: "src" } },
  { request: "parse the version field from package.json", values: { filter: ".version", file: "package.json" } },
  { request: "show the open prs", values: { state: "open" } },
];

for (const { request, values } of scenarios) {
  log(`\n> ${request}`);
  const routed = await client.tool("route_skill", { text: request });   // MCP: route
  const skillName = routed.split("\n")[0].split(/\s+/)[0];
  log(`  MCP route_skill  -> ${routed.split("\n")[0]}`);
  const body = await client.tool("get_skill", { name: skillName });      // MCP: load one plane
  log(`  MCP get_skill ${skillName}  -> loaded ${Math.ceil(body.length / 4)} tokens (only this plane)`);
  const template = local.get(skillName)?.tool ?? "";
  const command = fillCommand(template, values);
  const missing = commandPlaceholders(template).filter((p) => !(p in values));
  log(`  FILL ${skillName}  -> ${command}${missing.length ? `   (needs: ${missing.join(", ")})` : ""}`);
}

log("\n" + "=".repeat(68));
log("Every turn: the agent.3md MCP server chose the skill and served only its");
log("plane; the runner filled its bound command. Nothing ran; the commands above");
log("are the exact strings `bun run src/cli.ts run ... --exec` would execute.");
client.close();

// --- persist the transcript as documentation ---
const md = `# agent.3md over MCP - integration demo

An orchestrator drives the \`agent.3md\` MCP server (\`src/mcp.ts\`) over stdio.
For each request it calls \`route_skill\` to pick a skill, \`get_skill\` to load
only that skill's plane, then fills the skill's bound command template with typed
inputs to produce the exact command that would run. Nothing is executed here;
\`bun run src/cli.ts run ... --exec\` is what actually runs a command.

Run it: \`bun src/integration-demo.ts\`

\`\`\`
${out.join("\n")}
\`\`\`
`;
await Bun.write(fileURLToPath(new URL("../docs/integration-demo.md", import.meta.url)), md);
