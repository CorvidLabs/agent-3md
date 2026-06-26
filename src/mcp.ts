// MCP server that exposes an agent.3md's skills to ANY MCP-capable agent.
// Transport: newline-delimited JSON-RPC 2.0 over stdio (one JSON object per
// line), which is the MCP stdio convention. Only JSON-RPC responses go to
// stdout; everything else (logging) goes to stderr so the stream stays clean.
//
// Usage: bun src/mcp.ts [path/to/agent.3md]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Agent } from "./runtime";

const agentPath = process.argv[2] ?? fileURLToPath(new URL("../agent.3md", import.meta.url));
const agent = new Agent(readFileSync(agentPath, "utf8"));
const man = agent.manifest();

const TOOLS = [
  {
    name: "list_skills",
    description: `List every skill in the ${man.name} agent (name, triggers, cost) without loading any skill body.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "route_skill",
    description: "Given a free-text request, return the best-matching skills ranked by trigger hits.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "the user request to route" } },
      required: ["text"], additionalProperties: false,
    },
  },
  {
    name: "get_skill",
    description: "Fetch one skill's full instructions by name (progressive disclosure: load only this plane).",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "the skill name, e.g. sql-query" } },
      required: ["name"], additionalProperties: false,
    },
  },
  {
    name: "resolve_skill",
    description: "Fetch a skill plus its dependency chain (skills it links to), names and bodies.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "the skill name to resolve" } },
      required: ["name"], additionalProperties: false,
    },
  },
];

const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const errResult = (t: string) => ({ content: [{ type: "text", text: t }], isError: true });

function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_skills":
      return text(JSON.stringify(man.skills, null, 2));
    case "route_skill": {
      const ranked = agent.route(String(args.text ?? ""));
      if (!ranked.length) return text("no skill matched");
      return text(ranked.map((r) => `${r.skill.name}  (score ${r.score}; matched: ${r.hits.join(", ")})`).join("\n"));
    }
    case "get_skill": {
      const s = agent.get(String(args.name ?? ""));
      return s ? text(s.body) : errResult(`unknown skill: ${args.name}`);
    }
    case "resolve_skill": {
      const chain = agent.resolve(String(args.name ?? ""));
      if (!chain.length) return errResult(`unknown skill: ${args.name}`);
      return text(chain.map((s) => `### ${s.name}\n${s.body}`).join("\n\n"));
    }
    default:
      return null; // unknown tool
  }
}

function handle(msg: any): object | null {
  const { id, method, params } = msg ?? {};
  // notifications have no id; acknowledge by doing nothing
  if (id === undefined || id === null) return null;
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

  switch (method) {
    case "initialize":
      return ok({
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: `agent-3md:${man.name}`, version: "0.1.0" },
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call": {
      const res = callTool(params?.name, params?.arguments ?? {});
      if (res === null) return fail(-32602, `unknown tool: ${params?.name}`);
      return ok(res);
    }
    default:
      return fail(-32601, `method not found: ${method}`);
  }
}

const out = (obj: object) => process.stdout.write(JSON.stringify(obj) + "\n");
process.stderr.write(`[agent-3md mcp] ${man.name}: ${man.skills.length} skills from ${agentPath}\n`);

const decoder = new TextDecoder();
let buf = "";
for await (const chunk of Bun.stdin.stream()) {
  buf += decoder.decode(chunk);
  let nl: number;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg: any;
    try { msg = JSON.parse(line); }
    catch { out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }); continue; }
    const resp = handle(msg);
    if (resp) out(resp);
  }
}
