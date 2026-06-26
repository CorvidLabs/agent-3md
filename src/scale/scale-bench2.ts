// Tier-2 scaling: can per-turn IN-CONTEXT cost stay roughly flat as the skill
// library grows? For N in {10,25,50,100}, with REALISTIC skills, compare three
// strategies and measure routing accuracy.
//
//   A) naive: whole agent file in context every turn.
//   B) catalog (names+triggers) in context + the routed skill body. Realistic
//      lazy loading; the catalog grows with N.
//   C) identity + the routed skill body only. The catalog is NOT in the prompt;
//      the agent calls a routing TOOL (the index lives in the loader). This keeps
//      per-turn IN-CONTEXT cost flat, but it is NOT free: it adds a tool-call
//      round-trip every turn, and the catalog still costs memory/compute outside
//      the prompt. We count both honestly below.
//
// Token estimate: chars/4 with a +15% markdown correction (real tokenizers vary).
import { Agent } from "../runtime";
import { genAgent, genTestSet } from "./gen-big-agent";
import { routeQuery } from "../index-query";

const tok = (s: string) => Math.ceil((s.length / 4) * 1.15);

interface Row { n: number; full: number; b: number; cIn: number; toolOh: number; catalog: number; acc: number; }
const rows: Row[] = [];

for (const n of [10, 25, 50, 100]) {
  const raw = genAgent(n);
  const agent = new Agent(raw);
  const man = agent.manifest();

  const full = tok(raw);
  const identityTokens = tok(man.identity);
  const catalogText = man.skills.map((s) => `- ${s.name}: ${s.triggers.join(", ")}`).join("\n");
  const catalogTokens = tok(catalogText); // lives server-side for C; in-context for B

  const tests = genTestSet(n);
  let sumB = 0, sumCin = 0, sumTool = 0, correct = 0;
  for (const { request, correct: want } of tests) {
    const names = routeQuery(agent, request);     // C: out-of-context tool call
    const topName = names[0];
    if (topName === want) correct++;
    const chain = topName ? agent.resolve(topName) : [];
    const skillTokens = chain.reduce((acc, s) => acc + tok(s.body), 0);
    // honest tool-call overhead: the request goes out, skill names come back.
    const toolOverhead = tok(request) + tok(names.slice(0, 5).join(", "));
    sumB += identityTokens + catalogTokens + skillTokens;
    sumCin += identityTokens + skillTokens + toolOverhead;
    sumTool += toolOverhead;
  }
  rows.push({
    n, full,
    b: Math.round(sumB / tests.length),
    cIn: Math.round(sumCin / tests.length),
    toolOh: Math.round(sumTool / tests.length),
    catalog: catalogTokens,
    acc: Math.round((correct / tests.length) * 100),
  });
}

console.log("=".repeat(90));
console.log("TIER-2: keep per-turn IN-CONTEXT cost flat by moving the catalog to a routing tool");
console.log("=".repeat(90));
console.log("skills | A whole-file | B catalog+skill | C in-context (id+skill+tool) | C catalog (server-side) | acc");
console.log("-".repeat(90));
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(5)}  | ${String(r.full).padStart(11)}  | ${String(r.b).padStart(14)}  | ` +
    `${String(r.cIn).padStart(28)}  | ${String(r.catalog).padStart(22)}  | ${String(r.acc).padStart(2)}%`
  );
}

const first = rows[0], last = rows[rows.length - 1];
const cDrift = Math.round(((last.cIn - first.cIn) / first.cIn) * 100);
console.log("\n" + "-".repeat(90));
console.log(
  `HEADLINE: Strategy C keeps per-turn IN-CONTEXT cost roughly flat (${first.cIn} tok at N=10 vs ${last.cIn} at ` +
  `N=100, ${cDrift >= 0 ? "+" : ""}${cDrift}%) while the whole file grows ${(last.full / first.full).toFixed(1)}x ` +
  `to ${last.full}. Routing accuracy held at ${last.acc}%. The honest cost: C adds a ~${last.toolOh}-token tool ` +
  `round-trip per turn AND the ${last.catalog}-token catalog still lives outside the prompt (in the loader/index). ` +
  `So C trades prompt tokens for a tool call plus server-side state, not a free lunch, but it does decouple ` +
  `per-turn prompt size from skill count.`
);
