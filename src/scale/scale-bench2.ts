// Tier-2 scaling: does per-turn context stay FLAT as the skill library grows?
// For N in {10,25,50,100} compare per-turn context tokens for three strategies:
//   A) whole agent file in context every turn
//   B) manifest (identity + body-less catalog) once + only the routed skill chain
//   C) identity + only the routed skill chain; the catalog is NOT in context -
//      the agent calls routeQuery() as a TOOL (index lives in the loader)
import { Agent } from "../runtime";
import { genAgent } from "./gen-big-agent";
import { routeQuery } from "../index-query";

const tok = (s: string) => Math.ceil(s.length / 4);

interface Row { n: number; full: number; b: number; c: number; }
const rows: Row[] = [];

for (const n of [10, 25, 50, 100]) {
  const raw = genAgent(n);
  const agent = new Agent(raw);
  const man = agent.manifest();

  const fullTokens = tok(raw);
  const identityTokens = tok(man.identity);
  const catalog = man.skills.map((s) => `- ${s.name}: ${s.triggers.join(", ")}`).join("\n");
  const manifestTokens = tok(man.identity + "\n" + catalog); // B's fixed, in-context cost

  const reqs: string[] = [];
  for (let i = 0; i < 12; i++) {
    const s = man.skills[(i * 7 + 3) % man.skills.length];
    reqs.push(`please ${s.triggers[0]} this for me`);
  }

  let sumB = 0, sumC = 0;
  for (const r of reqs) {
    const name = routeQuery(agent, r)[0];           // tool call, out of context
    const chain = name ? agent.resolve(name) : [];
    const skillTokens = chain.reduce((acc, s) => acc + tok(s.body), 0);
    sumB += manifestTokens + skillTokens;           // B carries the catalog
    sumC += identityTokens + skillTokens;           // C carries only identity + skill
  }
  rows.push({ n, full: fullTokens, b: Math.round(sumB / reqs.length), c: Math.round(sumC / reqs.length) });
}

console.log("=".repeat(76));
console.log("TIER-2 SCALING: keep per-turn context FLAT as the agent grows");
console.log("=".repeat(76));
console.log("skills | A whole-file/turn | B manifest+skill | C identity+skill (catalog via tool)");
console.log("-".repeat(76));
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(5)}  | ${String(r.full).padStart(15)}   | ${String(r.b).padStart(14)}   | ${String(r.c).padStart(14)}`
  );
}

const max = Math.max(...rows.map((r) => r.full));
const W = 48;
console.log("\nper-turn cost (# A whole-file, = B manifest+skill, . C identity+skill):\n");
for (const r of rows) {
  console.log(`N=${String(r.n).padStart(3)}  ${"#".repeat(Math.max(1, Math.round((r.full / max) * W)))}  ${r.full}`);
  console.log(`       ${"=".repeat(Math.max(1, Math.round((r.b / max) * W)))}  ${r.b}`);
  console.log(`       ${".".repeat(Math.max(1, Math.round((r.c / max) * W)))}  ${r.c}`);
}

const first = rows[0], last = rows[rows.length - 1];
const cDrift = Math.round(((last.c - first.c) / first.c) * 100);
console.log("\n" + "-".repeat(76));
console.log(
  `HEADLINE: Strategy C stays ~flat - ${first.c} tok/turn at N=10 vs ${last.c} at N=100 ` +
  `(${cDrift >= 0 ? "+" : ""}${cDrift}% across a 10x skill increase), while whole-file grows ` +
  `${(last.full / first.full).toFixed(1)}x to ${last.full}. Moving the catalog out of context ` +
  `(routeQuery as a tool) makes per-turn cost independent of skill count.`
);
