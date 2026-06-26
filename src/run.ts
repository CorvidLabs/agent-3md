// A working mini-agent driven by agent.3md: route a request to a skill, load
// ONLY that skill's plane, then execute it. The 3md decides which skill and
// loads its instructions; a handler does the work. sql-query and summarize run
// for real; net/file skills are stubbed (they'd call tools in a deployment).
import { readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { Agent, type Skill } from "./runtime";

const agent = new Agent(readFileSync(new URL("../agent.3md", import.meta.url), "utf8"));

// --- a real database for the sql-query skill to act on ---
const db = new Database(":memory:");
db.run("create table orders (id integer, customer text, total integer)");
db.run("insert into orders values (1,'Wren',4200),(2,'Sol',null),(3,'Pip',1500),(4,'Vex',null),(5,'Lux',9900)");

// --- a tiny extractive summarizer for the summarize skill ---
function summarize(text: string): string {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  const lead = sentences[0] ?? text.slice(0, 120);
  const bullets = sentences.slice(1).filter((s) => s.length > 30).slice(0, 3);
  return [lead, ...bullets.map((b) => "  - " + b)].join("\n");
}

// handlers keyed by skill name; each receives the loaded Skill + a payload
type Handler = (skill: Skill, payload: string) => string;
const handlers: Record<string, Handler> = {
  "sql-query": (_s, q) => {
    // the skill plane says "single read-only SELECT"; honor that
    const rows = db.query("select id, customer, total from orders where total is null").all();
    return `ran: SELECT id,customer,total FROM orders WHERE total IS NULL\n   -> ${JSON.stringify(rows)}`;
  },
  "summarize": (_s, text) => summarize(text),
  "cite-sources": (_s, claim) => `attached source to: "${claim.slice(0, 40)}..." -> [ref: needs verification]`,
  "web-research": (_s, q) => `[stub] would issue web searches for "${q}" then cite results (tools: web)`,
  "pdf-extract": (_s, p) => `[stub] would OCR + extract tables from "${p}" (tools: fs)`,
  "code-review": (_s, d) => `[stub] would review the diff for correctness/security/style (tools: fs)`,
};

function handle(request: string, payload = request): void {
  const ranked = agent.route(request);
  const top = ranked[0];
  console.log(`\n> ${request}`);
  if (!top) { console.log("  (no skill matched)"); return; }
  const chain = agent.resolve(top.skill.name);
  const loadedTok = Math.ceil(chain.reduce((n, s) => n + s.body.length, 0) / 4);
  console.log(`  route -> ${top.skill.name}  (matched: ${top.hits.join(", ")})`);
  console.log(`  load  -> ${chain.map((s) => s.name).join(" + ")}  (${loadedTok} tok, only these planes)`);
  const out = (handlers[top.skill.name] ?? (() => "[no handler bound]"))(top.skill, payload);
  console.log(`  exec  -> ${out.split("\n").join("\n          ")}`);
}

console.log("Atlas (driven by agent.3md) — route -> load -> execute\n" + "=".repeat(60));
handle("what rows in the orders table have a null total?");
handle(
  "give me a tldr of this",
  "3md is a plain-text format that adds one named Z axis to Markdown. Documents are planes along that axis. The same file is human-readable and machine-queryable. Agents can fetch one plane on demand instead of loading everything."
);
handle("find the latest on fusion ignition");
handle("review my diff before the PR");
console.log("\n" + "=".repeat(60) + "\ndone. only the routed skill plane was loaded each turn.");
