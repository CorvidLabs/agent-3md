// Does progressive disclosure keep paying off as the skill library grows?
// For N in {10,25,50,100}: build an N-skill agent, then compare per-turn context
//   A) load the WHOLE agent file every turn
//   B) load the manifest (identity + body-less catalog) once + only the routed
//      skill chain per turn
import { writeFileSync } from "node:fs";
import { Agent } from "../runtime";
import { genAgent } from "./gen-big-agent";

const tok = (s: string) => Math.ceil(s.length / 4);
const dir = new URL(".", import.meta.url).pathname;

interface Row { n: number; full: number; manifest: number; avgB: number; saved: number; }
const rows: Row[] = [];

for (const n of [10, 25, 50, 100]) {
  const raw = genAgent(n);
  writeFileSync(`${dir}agent-${n}.3md`, raw); // keep the artifact
  const agent = new Agent(raw);
  const man = agent.manifest();

  const fullTokens = tok(raw);
  const catalog = man.skills.map((s) => `- ${s.name}: ${s.triggers.join(", ")}`).join("\n");
  const manifestTokens = tok(man.identity + "\n" + catalog);

  // build sample requests from real trigger verbs of randomly chosen skills,
  // so every request actually routes to a skill
  const skills = man.skills;
  const reqs: string[] = [];
  for (let i = 0; i < 12; i++) {
    const s = skills[(i * 7 + 3) % skills.length];
    const verb = s.triggers[0];
    reqs.push(`please ${verb} this for me`);
  }

  let sumB = 0;
  for (const r of reqs) {
    const top = agent.route(r)[0];
    const chain = top ? agent.resolve(top.skill.name) : [];
    const skillTokens = chain.reduce((acc, s) => acc + tok(s.body), 0);
    sumB += manifestTokens + skillTokens;
  }
  const avgB = Math.round(sumB / reqs.length);
  const saved = Math.round((1 - avgB / fullTokens) * 100);
  rows.push({ n, full: fullTokens, manifest: manifestTokens, avgB, saved });
}

console.log("=".repeat(74));
console.log("SCALING: progressive disclosure vs whole-file, as the agent grows");
console.log("=".repeat(74));
console.log("skills | whole-file/turn | manifest(once) | StratB avg/turn | tokens saved");
console.log("-".repeat(74));
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(5)}  | ${String(r.full).padStart(13)}   | ${String(r.manifest).padStart(11)}    | ${String(r.avgB).padStart(12)}    | ${String(r.saved).padStart(8)}%`
  );
}

// ASCII curve: whole-file (#) grows with N; Strategy B (=) stays ~flat
const max = Math.max(...rows.map((r) => r.full));
const W = 50;
console.log("\nper-turn token cost (# = whole-file, = = progressive):\n");
for (const r of rows) {
  const a = "#".repeat(Math.max(1, Math.round((r.full / max) * W)));
  const b = "=".repeat(Math.max(1, Math.round((r.avgB / max) * W)));
  console.log(`N=${String(r.n).padStart(3)}  ${a}  ${r.full}`);
  console.log(`       ${b}  ${r.avgB}`);
}

const first = rows[0], last = rows[rows.length - 1];
console.log("\n" + "-".repeat(74));
console.log(`HEADLINE: at 100 skills, progressive disclosure uses ${last.saved}% fewer tokens/turn ` +
  `(${last.avgB} vs ${last.full}). Whole-file grows ${(last.full / first.full).toFixed(1)}x from 10->100 skills; ` +
  `progressive stays ~flat, so the gap widens with every skill you add.`);
