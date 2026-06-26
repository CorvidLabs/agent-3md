// Validate an agent.3md against the agent3md/1 conventions, so "an agent in a
// 3md file" is a checkable standard, not just a habit. Reuses the canonical 3md
// parser; reports each problem against the offending plane's z.
//
// CLI:  bun run src/validate.ts <file.3md>   (exits non-zero if any errors)
import { parse } from "./threemd";

export type IssueLevel = "error" | "warning";
export interface Issue {
  readonly level: IssueLevel;
  readonly rule: string;
  readonly message: string;
  readonly z?: number;
}
export interface Report {
  readonly ok: boolean;
  readonly errors: Issue[];
  readonly warnings: Issue[];
}

const LINK_RE = /\[\[z=(\d+)(?:\|[^\]]*)?\]\]/g;

export function validateAgent(src: string): Report {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (rule: string, message: string, z?: number) => errors.push({ level: "error", rule, message, z });
  const warn = (rule: string, message: string, z?: number) => warnings.push({ level: "warning", rule, message, z });

  let doc;
  try {
    doc = parse(src);
  } catch (e: any) {
    return { ok: false, errors: [{ level: "error", rule: "parse", message: `not valid 3md: ${e?.message ?? e}` }], warnings: [] };
  }

  // --- required frontmatter: 3md, model, and (title or agent) ---
  if (!doc.version) err("frontmatter", "missing `3md:` version line");
  if (!doc.metadata.model) err("frontmatter", "missing required `model:` frontmatter");
  if (!doc.title && !doc.metadata.agent) err("frontmatter", "need a `title:` or `agent:` to name the agent");

  // --- exactly one identity plane (kind=identity) ---
  const identities = doc.planes.filter((p) => (p.attributes.kind ?? "") === "identity");
  if (identities.length === 0) err("identity", "no identity plane found (mark one plane `kind=identity`)");
  else if (identities.length > 1) {
    err("identity", `expected exactly one identity plane, found ${identities.length}`, identities[1].z);
  }
  const identitySet = new Set(identities.map((p) => p.z));
  const skills = doc.planes.filter((p) => !identitySet.has(p.z));

  // --- unique skill names (labels) ---
  const seen = new Map<string, number>();
  for (const s of skills) {
    const name = s.label ?? `skill-${s.z}`;
    if (seen.has(name)) err("unique-skill", `duplicate skill name "${name}" (also at z=${seen.get(name)})`, s.z);
    else seen.set(name, s.z);
  }

  // --- every [[z=N]] cross-plane link points to a real plane ---
  const planeZ = new Set(doc.planes.map((p) => p.z));
  for (const p of doc.planes) {
    for (const m of p.body.matchAll(LINK_RE)) {
      const target = Number(m[1]);
      if (!planeZ.has(target)) err("dead-link", `link [[z=${target}]] points to a plane that does not exist`, p.z);
    }
  }

  // --- entry (if present) resolves to a real plane ---
  if (doc.metadata.entry !== undefined) {
    const entryZ = Number(doc.metadata.entry);
    if (!Number.isFinite(entryZ) || !planeZ.has(entryZ)) {
      err("entry", `entry: "${doc.metadata.entry}" does not resolve to a real plane`);
    }
  }

  // --- each skill SHOULD have triggers (warning) ---
  for (const s of skills) {
    const triggers = (s.attributes.triggers ?? "").trim();
    if (!triggers) warn("triggers", `skill "${s.label ?? `skill-${s.z}`}" has no triggers; it can never be routed to`, s.z);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatReport(file: string, r: Report): string {
  const lines: string[] = [`agent3md validate: ${file}`];
  for (const e of r.errors) lines.push(`  ✗ [${e.rule}]${e.z !== undefined ? ` z=${e.z}` : ""}  ${e.message}`);
  for (const w of r.warnings) lines.push(`  ⚠ [${w.rule}]${w.z !== undefined ? ` z=${w.z}` : ""}  ${w.message}`);
  lines.push(`  ${r.ok ? "PASS" : "FAIL"} — ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  return lines.join("\n");
}

// CLI
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");
  const file = process.argv[2] ?? new URL("../agent.3md", import.meta.url).pathname;
  let src: string;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    console.error(`cannot read ${file}`);
    process.exit(2);
  }
  const report = validateAgent(src);
  console.log(formatReport(file, report));
  process.exit(report.ok ? 0 : 1);
}
