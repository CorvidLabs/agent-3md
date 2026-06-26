// Does loading one skill instead of all of them keep paying off as the skill
// library grows? For N in {10,25,50,100}, with REALISTIC skill bodies, compare
// per-turn context tokens and, crucially, measure ROUTING ACCURACY (savings are
// meaningless if the wrong skill gets loaded).
//
//   A) naive baseline: the whole agent file in context every turn. No real
//      framework does this; it is the worst case, shown for scale.
//   B) load only the routed skill chain, plus the skill catalog (names+triggers)
//      that the model needs in context to know what to route to. This is the
//      realistic "lazy tool loading" approach.
//
// Token counts are approximate: chars/4 undercounts markdown, so we apply a
// +15% correction. Real tokenizers vary by ~10-20%; the RATIOS are what matter.
import { writeFileSync } from "node:fs";
import { Agent } from "../runtime";
import { genAgent, genTestSet } from "./gen-big-agent";

const tok = (s: string) => Math.ceil((s.length / 4) * 1.15);
const dir = new URL(".", import.meta.url).pathname;

interface Row { n: number; full: number; catalog: number; avgB: number; saved: number; acc: number; }
const rows: Row[] = [];

for (const n of [10, 25, 50, 100]) {
  const raw = genAgent(n);
  writeFileSync(`${dir}agent-${n}.3md`, raw);
  const agent = new Agent(raw);
  const man = agent.manifest();

  const fullTokens = tok(raw);
  const catalogText = man.skills.map((s) => `- ${s.name}: ${s.triggers.join(", ")}`).join("\n");
  const catalogTokens = tok(man.identity + "\n" + catalogText); // B's in-context fixed cost

  const tests = genTestSet(n);
  let sumB = 0, correct = 0;
  for (const { request, correct: want } of tests) {
    const ranked = agent.route(request);
    const top = ranked[0];
    if (top && top.skill.name === want) correct++;
    const chain = top ? agent.resolve(top.skill.name) : [];
    const skillTokens = chain.reduce((acc, s) => acc + tok(s.body), 0);
    sumB += catalogTokens + skillTokens;
  }
  const avgB = Math.round(sumB / tests.length);
  rows.push({
    n, full: fullTokens, catalog: catalogTokens, avgB,
    saved: Math.round((1 - avgB / fullTokens) * 100),
    acc: Math.round((correct / tests.length) * 100),
  });
}

console.log("=".repeat(82));
console.log("SCALING (realistic skills, ~300 tok each): load one skill vs the whole file");
console.log("=".repeat(82));
console.log("skills | A whole-file/turn | catalog(in ctx) | B routed-skill/turn | saved vs A | routing acc");
console.log("-".repeat(82));
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(5)}  | ${String(r.full).padStart(15)}   | ${String(r.catalog).padStart(13)}   | ` +
    `${String(r.avgB).padStart(17)}   | ${String(r.saved).padStart(8)}%  | ${String(r.acc).padStart(9)}%`
  );
}

const first = rows[0], last = rows[rows.length - 1];
console.log("\n" + "-".repeat(82));
console.log(
  `HEADLINE: at ${last.n} skills, loading only the routed skill is ${last.saved}% fewer tokens/turn ` +
  `than dumping the whole file (${last.avgB} vs ${last.full} approx tokens), at ${last.acc}% routing accuracy. ` +
  `The whole file grows ${(last.full / first.full).toFixed(1)}x from N=10 to N=100; Strategy B grows far slower ` +
  `because the only variable part is one skill body. Note B still carries the ${last.catalog}-token catalog in ` +
  `context (see scale2 for moving that out via a routing tool).`
);
