// How much context does loading one skill (instead of all of them) save on the
// REAL 6-skill dev agent? Two strategies, plus routing accuracy.
//   A) the whole agent.3md in context every turn (naive baseline)
//   B) the skill catalog (names+triggers) in context + only the routed skill
//      chain (realistic lazy loading)
// Token counts are approximate (chars/4 with a +15% markdown correction); real
// tokenizers vary by ~10-20%, so treat absolute numbers as estimates and the
// ratios as the point.
import { readFileSync } from "node:fs";
import { Agent } from "./runtime";

const raw = readFileSync(new URL("../agent.3md", import.meta.url), "utf8");
const agent = new Agent(raw);
const man = agent.manifest();

const tok = (s: string) => Math.ceil((s.length / 4) * 1.15);

const fullTokens = tok(raw);
const catalog = man.skills.map((s) => `- ${s.name}: ${s.triggers.join(", ")}`).join("\n");
const catalogTokens = tok(man.identity + "\n" + catalog);

// requests paired with the skill that SHOULD handle them, so we can measure
// whether routing actually loads the right plane.
const cases: { req: string; want: string }[] = [
  { req: "find every TODO in src", want: "search" },
  { req: "list all test files under src", want: "files" },
  { req: "parse the version field from package.json", want: "json" },
  { req: "show the recent commits for the runtime", want: "commits" },
  { req: "show the open prs", want: "pr" },
  { req: "download the file from this http url", want: "fetch" },
];

console.log("=".repeat(74));
console.log("TOKEN-SAVINGS on the real 6-skill dev agent (approx tokens)");
console.log("=".repeat(74));
console.log(`whole agent.3md (Strategy A, every turn): ${fullTokens} tok`);
console.log(`catalog in context (Strategy B fixed):    ${catalogTokens} tok`);
console.log("");

let sumB = 0, correct = 0;
for (const { req, want } of cases) {
  const ranked = agent.route(req);
  const top = ranked[0];
  const ok = !!top && top.skill.name === want;
  if (ok) correct++;
  const chain = top ? agent.resolve(top.skill.name) : [];
  const skillTokens = chain.reduce((n, s) => n + tok(s.body), 0);
  const bTotal = catalogTokens + skillTokens;
  sumB += bTotal;
  const names = chain.map((s) => s.name).join("+") || "(none)";
  console.log(`  ${req}`);
  console.log(`     -> ${names.padEnd(26)} ${ok ? "OK " : "MISS"} (want ${want})  B=${bTotal} tok  vs ${fullTokens}  ->  ${Math.round((1 - bTotal / fullTokens) * 100)}% less`);
}

const avgB = Math.round(sumB / cases.length);
const avgSaved = Math.round((1 - avgB / fullTokens) * 100);
const acc = Math.round((correct / cases.length) * 100);
console.log("");
console.log("-".repeat(74));
console.log(`average per turn: B ${avgB} tok vs A ${fullTokens} tok -> ${avgSaved}% fewer tokens, routing accuracy ${acc}%.`);
console.log(`On a small agent the win is modest; it grows with skill count and skill size`);
console.log(`(see 'bun run scale'). The honest claim: you load one skill, not all of them.`);
