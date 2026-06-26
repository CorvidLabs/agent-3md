// Prove the idea: load the agent from one 3md file, then route requests, fetch
// single skills on demand, and resolve dependencies, all instant, from an index.
import { readFileSync } from "node:fs";
import { Agent } from "./runtime";

const src = readFileSync(new URL("../agent.3md", import.meta.url), "utf8");

const t0 = performance.now();
const agent = new Agent(src);
const loadMs = performance.now() - t0;

const man = agent.manifest();
console.log("=".repeat(64));
console.log(`AGENT MANIFEST  (parsed + indexed in ${loadMs.toFixed(2)} ms)`);
console.log(`  name:   ${man.name}`);
console.log(`  model:  ${man.model}`);
console.log(`  tools:  ${man.tools.join(", ")}`);
console.log(`  skills: ${man.skills.length}  ->  ${man.skills.map((s) => s.name).join(", ")}`);
console.log("=".repeat(64));

const requests = [
  "find every TODO in src",
  "list all test files under src",
  "parse the version field from package.json",
  "show the recent commits for the runtime",
  "show the open prs",
  "download the file from this http url",
];

console.log("\nROUTING (free text -> skill, by trigger index):\n");
for (const r of requests) {
  const t = performance.now();
  const ranked = agent.route(r);
  const us = ((performance.now() - t) * 1000).toFixed(0);
  const top = ranked[0];
  console.log(`  "${r}"`);
  if (top) {
    const chain = agent.resolve(top.skill.name).map((s) => s.name);
    console.log(`     -> ${top.skill.name}  (matched: ${top.hits.join(", ")})  [${us}us]`);
    if (chain.length > 1) console.log(`        loads: ${chain.join(" + ")}`);
  } else {
    console.log(`     -> (no skill matched)`);
  }
}

console.log("\nINSTANT FETCH of one skill body (progressive disclosure):\n");
const t1 = performance.now();
const search = agent.get("search");
const us1 = ((performance.now() - t1) * 1000).toFixed(0);
console.log(`  get("search") in ${us1}us -> ${search!.body.split("\n").length} lines, binary=${search!.binary}, inputs=[${search!.inputs.join(", ")}], tool=${search!.tool}`);
console.log("  --- first lines of that skill (the only plane an agent would load) ---");
console.log(search!.body.split("\n").slice(0, 4).map((l) => "    " + l).join("\n"));

console.log("\nROUTE -> FILL -> COMMAND (a request becomes a runnable command):\n");
const ask = "find every TODO in src";
const picked = agent.route(ask)[0].skill;
const command = agent.command(picked.name, { pattern: "TODO", path: "src" });
console.log(`  "${ask}"`);
console.log(`     -> ${picked.name}  (template: ${picked.tool})`);
console.log(`     -> ${command}`);

console.log("\nJSON the agent can query (skill catalog, no bodies):");
console.log(JSON.stringify(man.skills, null, 0));
