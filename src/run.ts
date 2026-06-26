// A working mini-agent driven by agent.3md: route a request to a skill, load
// ONLY that skill's plane, fill its typed inputs into the bound command, and
// print the real command that would run. The 3md decides which skill and which
// tool; the runner supplies the values. Nothing is executed here - this is an
// honest route -> fill -> command demo (add --exec in the CLI to actually run).
import { readFileSync } from "node:fs";
import { Agent, commandPlaceholders } from "./runtime";

const agent = new Agent(readFileSync(new URL("../agent.3md", import.meta.url), "utf8"));

// each scenario is a free-text request plus the values a runner would fill into
// the routed skill's command placeholders.
const scenarios: { request: string; values: Record<string, string> }[] = [
  { request: "find every TODO in src", values: { pattern: "TODO", path: "src" } },
  { request: "list all test files under src", values: { glob: "*.test.ts", dir: "src" } },
  { request: "parse the version field from package.json", values: { filter: ".version", file: "package.json" } },
  { request: "show the recent commits for the runtime", values: { count: "5", path: "src/runtime.ts" } },
  { request: "show the open prs", values: { state: "open" } },
];

function handle({ request, values }: { request: string; values: Record<string, string> }): void {
  const top = agent.route(request)[0];
  console.log(`\n> ${request}`);
  if (!top) { console.log("  (no skill matched)"); return; }
  const skill = top.skill;
  const chain = agent.resolve(skill.name);
  const loadedTok = Math.ceil(chain.reduce((n, s) => n + s.body.length, 0) / 4);
  console.log(`  route -> ${skill.name}  (matched: ${top.hits.join(", ")})`);
  console.log(`  load  -> ${chain.map((s) => s.name).join(" + ")}  (${loadedTok} tok, only these planes)`);
  console.log(`  tool  -> ${skill.tool}`);
  const command = agent.command(skill.name, values);
  console.log(`  fill  -> ${command}`);
  const missing = skill.tool ? commandPlaceholders(skill.tool).filter((p) => !(p in values)) : [];
  if (missing.length) console.log(`  needs -> ${missing.join(", ")} (still unfilled)`);
}

console.log("dev (driven by agent.3md) - route -> load -> fill -> command\n" + "=".repeat(60));
for (const s of scenarios) handle(s);
console.log("\n" + "=".repeat(60));
console.log("done. each turn loaded only the routed plane, then filled its real");
console.log("command. nothing ran here; `bun run src/cli.ts run ... --exec` executes.");
