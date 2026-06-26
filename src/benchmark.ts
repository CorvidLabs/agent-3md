// How much context does progressive disclosure save? Compare two strategies:
//   A) load the WHOLE agent.3md into context every turn (all skills)
//   B) load the manifest once, then only the routed skill (+ its deps) per turn
import { readFileSync } from "node:fs";
import { Agent } from "./runtime";

const raw = readFileSync(new URL("../agent.3md", import.meta.url), "utf8");
const agent = new Agent(raw);
const man = agent.manifest();

const tok = (s: string) => Math.ceil(s.length / 4); // rough char->token estimate

// Strategy A: the entire document, every turn.
const fullTokens = tok(raw);

// Strategy B fixed cost: the identity + a body-less skill catalog, loaded once.
const catalog = man.skills.map((s) => `- ${s.name}: ${s.triggers.join(", ")}`).join("\n");
const manifestTokens = tok(man.identity + "\n" + catalog);

const requests = [
  "find me the latest research on tokamak fusion",
  "pull the tables out of this scanned pdf",
  "what rows in the orders table have a null total?",
  "give me a tldr of this article",
  "review my diff for bugs before I open the PR",
];

console.log("=".repeat(72));
console.log("TOKEN-SAVINGS: progressive disclosure vs loading the whole agent file");
console.log("=".repeat(72));
console.log(`whole agent.3md:        ${fullTokens} tok  (Strategy A loads this EVERY turn)`);
console.log(`manifest (loaded once): ${manifestTokens} tok  (identity + body-less skill catalog)`);
console.log("");
console.log("per request (Strategy B = manifest + only the routed skill chain):");
console.log("");

let sumB = 0;
for (const r of requests) {
  const top = agent.route(r)[0];
  const chain = top ? agent.resolve(top.skill.name) : [];
  const skillTokens = chain.reduce((n, s) => n + tok(s.body), 0);
  const bTotal = manifestTokens + skillTokens;
  sumB += bTotal;
  const saved = Math.round((1 - bTotal / fullTokens) * 100);
  const names = chain.map((s) => s.name).join("+") || "(none)";
  console.log(`  ${r}`);
  console.log(`     loads ${names.padEnd(28)} skill=${String(skillTokens).padStart(3)} tok  total=${String(bTotal).padStart(3)} tok  vs ${fullTokens}  ->  ${saved}% less`);
}

const avgB = Math.round(sumB / requests.length);
const avgSaved = Math.round((1 - avgB / fullTokens) * 100);
console.log("");
console.log("-".repeat(72));
console.log(`average per turn:  Strategy B ${avgB} tok  vs  Strategy A ${fullTokens} tok  ->  ${avgSaved}% fewer tokens`);
console.log(`and it scales: with 6 skills the catalog is tiny; with 100 skills,`);
console.log(`Strategy A grows linearly while Strategy B stays ~manifest + one skill.`);
