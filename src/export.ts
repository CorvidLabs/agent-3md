// Project an agent.3md into a portable JSON manifest so a non-3md consumer (any
// language, any runtime) can query the agent's skills without a 3md parser.
//
//   bun run src/export.ts <file.3md> [--bodies]
//
// Without --bodies you get the catalog only (no skill instructions); with
// --bodies an extra { name: body } map is included for full hydration.
import { readFileSync } from "node:fs";
import { Agent } from "./runtime";

const args = process.argv.slice(2);
const withBodies = args.includes("--bodies");
const fileArg = args.find((a) => !a.startsWith("--"));
const path = fileArg ?? new URL("../agent.3md", import.meta.url).pathname;

const agent = new Agent(readFileSync(path, "utf8"));
const man = agent.manifest();

const skills = man.skills.map((s) => {
  const full = agent.get(s.name)!;
  return {
    name: full.name,
    z: full.z,
    triggers: full.triggers,
    inputs: full.inputs,
    cost: full.cost,
    deps: full.deps,
  };
});

const out: Record<string, unknown> = {
  schema: "agent3md/1",
  agent: { name: man.name, model: man.model, tools: man.tools, persona: man.persona },
  skills,
};

if (withBodies) {
  const bodies: Record<string, string> = {};
  for (const s of man.skills) bodies[s.name] = agent.get(s.name)!.body;
  out.bodies = bodies;
}

console.log(JSON.stringify(out, null, 2));
