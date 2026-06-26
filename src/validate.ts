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

  // --- required frontmatter: just `3md` and a name. `model` is an optional
  //     hint the host may override, so it is not required. ---
  if (!doc.version) err("frontmatter", "missing `3md:` version line");
  if (!doc.title && !doc.metadata.agent) err("frontmatter", "need a `title:` or `agent:` to name the agent");

  // --- identity plane: exactly one explicit `kind=identity`, or (fallback) the
  //     first plane when none is marked. Only an empty document is fatal. ---
  const explicitIds = doc.planes.filter((p) => (p.attributes.kind ?? "") === "identity");
  if (explicitIds.length > 1) {
    err("identity", `expected one identity plane, found ${explicitIds.length}`, explicitIds[1].z);
  } else if (explicitIds.length === 0 && doc.planes.length === 0) {
    err("identity", "document has no planes (need at least an identity plane)");
  }
  const identitySet = new Set<number>(
    explicitIds.length ? explicitIds.map((p) => p.z)
      : doc.planes.length ? [doc.planes[0].z] : []
  );
  const skills = doc.planes.filter((p) => !identitySet.has(p.z));

  // --- every skill has a unique, non-empty name (label) ---
  const seen = new Map<string, number>();
  for (const s of skills) {
    const name = s.label?.trim();
    if (!name) { err("missing-label", `skill at z=${s.z} has no label (every skill needs a name)`, s.z); continue; }
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

  // --- entry (if present) must be a plane z (integer) that exists ---
  if (doc.metadata.entry !== undefined) {
    const raw = String(doc.metadata.entry).trim();
    if (!/^-?\d+$/.test(raw)) {
      err("entry", `entry: "${doc.metadata.entry}" must be a plane z (an integer)`);
    } else if (!planeZ.has(Number(raw))) {
      err("entry", `entry: "${doc.metadata.entry}" does not resolve to a real plane`);
    }
  }

  // --- no dependency cycles (a -> ... -> a via [[z=N]] links) ---
  const links = new Map<number, number[]>();
  for (const p of doc.planes) {
    links.set(p.z, [...p.body.matchAll(LINK_RE)].map((m) => Number(m[1])).filter((t) => planeZ.has(t)));
  }
  const color = new Map<number, 0 | 1 | 2>(); // 0 unseen, 1 on-stack, 2 done
  let cyclic: number | undefined;
  const walk = (z: number) => {
    if (cyclic !== undefined) return;
    color.set(z, 1);
    for (const t of links.get(z) ?? []) {
      const c = color.get(t) ?? 0;
      if (c === 1) { cyclic = t; return; }
      if (c === 0) { walk(t); if (cyclic !== undefined) return; }
    }
    color.set(z, 2);
  };
  for (const p of doc.planes) { if ((color.get(p.z) ?? 0) === 0) walk(p.z); if (cyclic !== undefined) break; }
  if (cyclic !== undefined) err("cycle", `dependency cycle detected (involving plane z=${cyclic})`, cyclic);

  // --- each skill SHOULD have triggers (warning) ---
  for (const s of skills) {
    const triggers = (s.attributes.triggers ?? "").trim();
    if (!triggers) warn("triggers", `skill "${s.label ?? `skill-${s.z}`}" has no triggers; it can never be routed to`, s.z);
  }

  // --- typed inputs + tool bindings (agent3md/1, additive) ---
  // An input item is `name`, `name:type`, or `name:type?` (trailing `?` =
  // optional). A bare name is a required string. Types are a closed set.
  const INPUT_TYPES = new Set(["string", "number", "boolean", "object", "array"]);
  for (const s of skills) {
    const items = (s.attributes.inputs ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const names = new Set<string>();
    for (const item of items) {
      let body = item;
      if (body.endsWith("?")) body = body.slice(0, -1).trimEnd();
      const i = body.indexOf(":");
      const name = (i === -1 ? body : body.slice(0, i)).trim();
      const type = (i === -1 ? "string" : body.slice(i + 1).trim().toLowerCase()) || "string";
      if (!name) continue;
      if (names.has(name)) err("dup-input", `skill "${s.label ?? `skill-${s.z}`}" declares input "${name}" more than once`, s.z);
      else names.add(name);
      if (!INPUT_TYPES.has(type)) {
        err("input-type", `input "${name}" has unknown type "${type}" (use one of: ${[...INPUT_TYPES].join(", ")})`, s.z);
      }
    }
    // A tool binding (`tool=`) is optional, but if present it MUST be non-empty.
    const sname = s.label ?? `skill-${s.z}`;
    const tool = (s.attributes.tool ?? "").trim();
    if (s.attributes.tool !== undefined && !tool) {
      warn("tool", `skill "${sname}" has an empty tool binding`, s.z);
    }
    // Command templates tie the binding to the inputs: every `{placeholder}` in
    // `tool` MUST be a declared input, and a declared input the command never
    // uses is a likely mistake (warning).
    if (tool) {
      const used = new Set<string>();
      for (const m of tool.matchAll(/\{([a-zA-Z_]\w*)\}/g)) {
        used.add(m[1]);
        if (!names.has(m[1])) {
          err("tool-input", `skill "${sname}" command references {${m[1]}}, which is not a declared input`, s.z);
        }
      }
      for (const n of names) {
        if (!used.has(n)) warn("unused-input", `skill "${sname}" declares input "${n}" that its command never uses`, s.z);
      }
    }
  }

  // --- honest manifest: a skill's binary SHOULD be listed in frontmatter
  //     `tools` (when `tools` is declared), so the manifest does not lie about
  //     what the agent runs. ---
  const declaredTools = (doc.metadata.tools ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  if (declaredTools.length) {
    const declared = new Set(declaredTools);
    for (const s of skills) {
      const tool = (s.attributes.tool ?? "").trim();
      if (!tool) continue;
      const binary = tool.split(/\s+/)[0];
      if (!declared.has(binary)) {
        warn("undeclared-tool", `skill "${s.label ?? `skill-${s.z}`}" runs "${binary}", which is not in the agent's tools list`, s.z);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatReport(file: string, r: Report): string {
  const lines: string[] = [`agent3md validate: ${file}`];
  for (const e of r.errors) lines.push(`  ✗ [${e.rule}]${e.z !== undefined ? ` z=${e.z}` : ""}  ${e.message}`);
  for (const w of r.warnings) lines.push(`  ⚠ [${w.rule}]${w.z !== undefined ? ` z=${w.z}` : ""}  ${w.message}`);
  lines.push(`  ${r.ok ? "PASS" : "FAIL"} - ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
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
