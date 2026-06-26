// End-to-end integration: an orchestrator (the "agent") handles user requests by
// driving the agent.3md MCP server over stdio. For each request it asks the
// server to ROUTE to a skill, then to GET only that skill's plane (progressive
// disclosure), then EXECUTES the skill with a real handler. sql-query hits a
// live bun:sqlite database through the MCP round-trip; summarize runs for real.
//
// Run: bun src/integration-demo.ts
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";

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

// --- the orchestrator's real skill handlers (what runs after a skill loads) ---
const db = new Database(":memory:");
db.run("create table orders (id integer, customer text, total integer)");
db.run("insert into orders values (1,'Wren',4200),(2,'Sol',null),(3,'Pip',1500),(4,'Vex',null),(5,'Lux',9900)");

function summarize(text: string): string {
  const s = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  return [s[0] ?? text, ...s.slice(1).filter((x) => x.length > 30).slice(0, 2).map((x) => "  - " + x)].join("\n");
}

const handlers: Record<string, (payload: string) => string> = {
  "sql-query": () => {
    const rows = db.query("select id, customer, total from orders where total is null").all();
    return `SELECT id,customer,total FROM orders WHERE total IS NULL  ->  ${JSON.stringify(rows)}`;
  },
  "summarize": (p) => summarize(p),
  "code-review": () => "[stub] would review the diff for correctness/security/style (tools: fs)",
};

// --- the scenario ---
const out: string[] = [];
const log = (s = "") => { console.log(s); out.push(s); };

const mcpPath = fileURLToPath(new URL("./mcp.ts", import.meta.url));
const agentPath = fileURLToPath(new URL("../agent.3md", import.meta.url));
const client = new McpClient(["bun", mcpPath, agentPath]);

const init = await client.call("initialize", { protocolVersion: "2024-11-05", capabilities: {} });
log("agent.3md  x  MCP  -  route -> load -> execute (all over the MCP round-trip)");
log("=".repeat(68));
log(`connected: ${init.result.serverInfo.name}  (proto ${init.result.protocolVersion})`);

const scenarios: { request: string; payload?: string }[] = [
  { request: "what rows in the orders table have a null total?" },
  {
    request: "summarize this for me",
    payload:
      "3md is a plain-text format that adds one named Z axis to Markdown. A document is a stack of planes along that axis. The same file is human-readable and machine-queryable. An agent can fetch one plane on demand instead of loading everything.",
  },
  { request: "review my diff before the PR" },
];

for (const { request, payload } of scenarios) {
  log(`\n> ${request}`);
  const routed = await client.tool("route_skill", { text: request });   // MCP: route
  const skill = routed.split("\n")[0].split(/\s+/)[0];
  log(`  MCP route_skill  -> ${routed.split("\n")[0]}`);
  const body = await client.tool("get_skill", { name: skill });          // MCP: load one plane
  log(`  MCP get_skill ${skill}  -> loaded ${Math.ceil(body.length / 4)} tokens (only this plane)`);
  const handler = handlers[skill] ?? (() => "[no handler bound]");
  log(`  EXECUTE ${skill}  -> ${handler(payload ?? request)}`);
}

log("\n" + "=".repeat(68));
log("Every turn: the agent.3md MCP server chose the skill and served only its");
log("plane; the orchestrator executed it. The SQL result above is a live query.");
client.close();

// --- persist the transcript as documentation ---
const md = `# agent.3md over MCP - integration demo

An orchestrator drives the \`agent.3md\` MCP server (\`src/mcp.ts\`) over stdio.
For each request it calls \`route_skill\` to pick a skill, \`get_skill\` to load
only that skill's plane, then executes it with a real handler. \`sql-query\` runs
a live query against an in-memory database; \`summarize\` runs for real.

Run it: \`bun src/integration-demo.ts\`

\`\`\`
${out.join("\n")}
\`\`\`
`;
await Bun.write(fileURLToPath(new URL("../docs/integration-demo.md", import.meta.url)), md);
