// Treat a single 3md document as an entire agent: plane 0 is the agent's
// identity, every other plane is a skill. The canonical 3md parser turns the
// file into planes; this runtime builds a tiny index over plane attributes so a
// request can be routed to the right skill and that skill's body fetched on
// demand (progressive disclosure) instead of loading the whole file.
import { parse, type Document, type Plane } from "./threemd";

export interface Skill {
  readonly z: number;
  readonly name: string;
  readonly triggers: string[];
  readonly inputs: string[];
  readonly cost: string | null;
  readonly deps: number[];      // z indices of [[z=N|..]] links in the body
  readonly body: string;
}

export interface AgentManifest {
  readonly name: string;
  readonly model: string;
  readonly tools: string[];
  readonly persona: string;
  readonly identity: string;    // plane 0 body
  readonly skills: { name: string; z: number; triggers: string[]; cost: string | null }[];
}

const csv = (v: string | undefined): string[] =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

export class Agent {
  private doc: Document;
  private byName = new Map<string, Skill>();
  private byZ = new Map<number, Skill>();
  private triggerIndex = new Map<string, Set<string>>(); // word -> skill names
  readonly identityPlane: Plane;

  constructor(src: string) {
    this.doc = parse(src);
    const identity = this.doc.planes.find((p) => (p.attributes.kind ?? "") === "identity")
      ?? this.doc.planes[0];
    this.identityPlane = identity;
    for (const p of this.doc.planes) {
      if (p === identity) continue;
      const triggers = csv(p.attributes.triggers);
      const deps = [...p.body.matchAll(/\[\[z=(\d+)\|/g)].map((m) => Number(m[1]));
      const skill: Skill = {
        z: p.z,
        name: p.label ?? `skill-${p.z}`,
        triggers,
        inputs: csv(p.attributes.inputs),
        cost: p.attributes.cost ?? null,
        deps,
        body: p.body,
      };
      this.byName.set(skill.name, skill);
      this.byZ.set(skill.z, skill);
      for (const t of triggers) for (const w of t.split(/\s+/)) {
        const key = w.toLowerCase();
        (this.triggerIndex.get(key) ?? this.triggerIndex.set(key, new Set()).get(key)!).add(skill.name);
      }
    }
  }

  /** The agent's manifest: identity + a light skill catalog (no skill bodies). */
  manifest(): AgentManifest {
    const m = this.doc.metadata;
    return {
      name: this.doc.title ?? m.agent ?? "agent",
      model: m.model ?? "unknown",
      tools: csv(m.tools),
      persona: m.persona ?? "",
      identity: this.identityPlane.body,
      skills: [...this.byName.values()].map((s) => ({ name: s.name, z: s.z, triggers: s.triggers, cost: s.cost })),
    };
  }

  /** O(1) fetch of a single skill's full body by name or z. */
  get(nameOrZ: string | number): Skill | undefined {
    return typeof nameOrZ === "number" ? this.byZ.get(nameOrZ) : this.byName.get(nameOrZ);
  }

  /** Route a free-text request to the best-matching skills, ranked by trigger hits. */
  route(text: string): { skill: Skill; score: number; hits: string[] }[] {
    const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
    const score = new Map<string, { n: number; hits: Set<string> }>();
    for (const w of words) {
      const names = this.triggerIndex.get(w);
      if (!names) continue;
      for (const name of names) {
        const e = score.get(name) ?? { n: 0, hits: new Set<string>() };
        e.n++; e.hits.add(w); score.set(name, e);
      }
    }
    return [...score.entries()]
      .map(([name, e]) => ({ skill: this.byName.get(name)!, score: e.n, hits: [...e.hits] }))
      .sort((a, b) => b.score - a.score);
  }

  /** Resolve a skill plus everything it depends on (via [[z=N]] links), transitively. */
  resolve(nameOrZ: string | number): Skill[] {
    const start = this.get(nameOrZ);
    if (!start) return [];
    const out: Skill[] = [], seen = new Set<number>();
    const visit = (s: Skill) => {
      if (seen.has(s.z)) return;
      seen.add(s.z); out.push(s);
      for (const z of s.deps) { const d = this.byZ.get(z); if (d) visit(d); }
    };
    visit(start);
    return out;
  }
}
