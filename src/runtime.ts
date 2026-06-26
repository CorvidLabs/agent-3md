// Treat a single 3md document as an entire agent: plane 0 is the agent's
// identity, every other plane is a skill. The canonical 3md parser turns the
// file into planes; this runtime builds a tiny index over plane attributes so a
// request can be routed to the right skill and that skill's body fetched on
// demand (progressive disclosure) instead of loading the whole file.
import { parse, type Document, type Plane } from "./threemd";

/** A declared input to a skill: its name, a type token, and whether it is required. */
export interface SkillInput {
  readonly name: string;
  readonly type: string;        // a canonical type token (string/number/boolean/object/array); see SPEC.md
  readonly required: boolean;
}

export interface Skill {
  readonly z: number;
  readonly name: string;
  readonly triggers: string[];
  readonly inputs: string[];        // input names in declared order (back-compatible with the bare CSV form)
  readonly inputSchema: SkillInput[]; // the typed inputs parsed from `inputs="name:type?"`
  readonly tool: string | null;     // the command this skill drives, from `tool=` (a template; null if unbound)
  readonly binary: string | null;   // the first token of `tool` (the executable), e.g. "rg"
  readonly cost: string | null;
  readonly deps: number[];      // z indices of [[z=N]] / [[z=N|label]] links in the body
  readonly body: string;
}

// A `tool=` command may contain `{input}` placeholders that name the skill's
// typed inputs, e.g. `rg --line-number {pattern} {path}`. fillCommand swaps each
// placeholder for a shell-quoted value; unprovided placeholders are left visible
// so a caller can see what still needs filling.
const PLACEHOLDER_RE = /\{([a-zA-Z_]\w*)\}/g;
const shQuote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** The placeholder names referenced by a command template, in order, de-duplicated. */
export function commandPlaceholders(template: string): string[] {
  return [...new Set([...template.matchAll(PLACEHOLDER_RE)].map((m) => m[1]))];
}

/** Fill a command template's `{input}` placeholders from `values` (shell-quoted). */
export function fillCommand(template: string, values: Record<string, string> = {}): string {
  return template.replace(PLACEHOLDER_RE, (whole, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? shQuote(values[name]) : whole);
}

// A dependency / cross-plane link: `[[z=N]]` or `[[z=N|label]]`. One grammar,
// shared by the runtime, the validator, the spec, and the Rust/Swift loaders.
const LINK_RE = /\[\[z=(\d+)(?:\|[^\]]*)?\]\]/g;

// Tokenize for routing: maximal runs of Unicode letters/digits, lowercased.
// Identical across the TS, Rust, and Swift loaders so routing never diverges.
const tokenize = (s: string): string[] => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export interface AgentManifest {
  readonly name: string;
  readonly model: string;
  readonly tools: string[];
  readonly persona: string;
  readonly identity: string;    // plane 0 body
  readonly skills: { name: string; z: number; triggers: string[]; cost: string | null; tool: string | null }[];
}

const csv = (v: string | undefined): string[] =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

// Parse a typed input list: `inputs="question, limit:number?, schema:string"`.
// Each item is `name`, `name:type`, or `name:type?` (a trailing `?` marks it
// optional). A bare name defaults to type "string" and required. One grammar,
// shared with the Rust and Swift loaders so the typed contract never diverges.
const parseInputs = (v: string | undefined): SkillInput[] =>
  csv(v).map((item) => {
    let s = item, required = true;
    if (s.endsWith("?")) { required = false; s = s.slice(0, -1).trimEnd(); }
    const i = s.indexOf(":");
    const name = (i === -1 ? s : s.slice(0, i)).trim();
    const type = (i === -1 ? "string" : s.slice(i + 1).trim().toLowerCase()) || "string";
    return { name, type, required };
  }).filter((x) => x.name.length > 0);

export class Agent {
  private doc: Document;
  private byName = new Map<string, Skill>();
  private byZ = new Map<number, Skill>();
  readonly identityPlane: Plane;

  constructor(src: string) {
    this.doc = parse(src);
    const identity = this.doc.planes.find((p) => (p.attributes.kind ?? "") === "identity")
      ?? this.doc.planes[0];
    this.identityPlane = identity;
    for (const p of this.doc.planes) {
      if (p === identity) continue;
      const inputSchema = parseInputs(p.attributes.inputs);
      const tool = p.attributes.tool?.trim() || null;
      const skill: Skill = {
        z: p.z,
        name: p.label ?? `skill-${p.z}`,
        triggers: csv(p.attributes.triggers),
        inputs: inputSchema.map((x) => x.name),
        inputSchema,
        tool,
        binary: tool ? tool.split(/\s+/)[0] : null,
        cost: p.attributes.cost ?? null,
        deps: [...p.body.matchAll(LINK_RE)].map((m) => Number(m[1])),
        body: p.body,
      };
      this.byName.set(skill.name, skill);
      this.byZ.set(skill.z, skill);
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
      skills: [...this.byName.values()].map((s) => ({ name: s.name, z: s.z, triggers: s.triggers, cost: s.cost, tool: s.tool })),
    };
  }

  /** O(1) fetch of a single skill's full body by name or z. */
  get(nameOrZ: string | number): Skill | undefined {
    return typeof nameOrZ === "number" ? this.byZ.get(nameOrZ) : this.byName.get(nameOrZ);
  }

  /**
   * Route a request to skills whose triggers it satisfies. Score = the number
   * of distinct trigger phrases matched (a trigger phrase matches only when ALL
   * of its words appear in the request, so "look up" needs both "look" and
   * "up"). Sorted by score, ties broken by lower z. Empty array = no match.
   */
  route(text: string): { skill: Skill; score: number; hits: string[] }[] {
    const req = new Set(tokenize(text));
    const out: { skill: Skill; score: number; hits: string[] }[] = [];
    for (const skill of this.byName.values()) {
      const hits = skill.triggers.filter((t) => {
        const tw = tokenize(t);
        return tw.length > 0 && tw.every((w) => req.has(w));
      });
      if (hits.length) out.push({ skill, score: hits.length, hits });
    }
    return out.sort((a, b) => b.score - a.score || a.skill.z - b.skill.z);
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

  /**
   * The runnable command for a skill, with `{input}` placeholders filled from
   * `values` (shell-quoted). Returns null if the skill has no `tool`. Any
   * placeholder without a value is left visible so the caller sees what to fill.
   */
  command(nameOrZ: string | number, values: Record<string, string> = {}): string | null {
    const s = this.get(nameOrZ);
    return s?.tool ? fillCommand(s.tool, values) : null;
  }
}
