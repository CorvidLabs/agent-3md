#!/usr/bin/env bun
// agent3md - a small CLI over any agent.3md file.
//
//   bun run src/cli.ts <command> [file] [args]
//
// `file` is optional and defaults to the project's ../agent.3md. A file is
// recognized when the argument exists on disk or ends in `.3md`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Agent, commandPlaceholders } from "./runtime";

const DEFAULT_FILE = fileURLToPath(new URL("../agent.3md", import.meta.url));

const USAGE = `agent3md - query a 3md-packaged agent

usage:
  bun run src/cli.ts <command> [file] [args]

commands:
  new      <name> [outfile]  scaffold a new valid agent.3md (default <name>.3md)
  manifest [file]            agent name/model/tools + skill catalog (no bodies)
  skills   [file]            just the skill names
  route    [file] <text>     rank skills matching the request + the load chain
  get      [file] <skill>    print one skill's body (progressive disclosure)
  resolve  [file] <skill>    a skill plus its transitive dependency chain
  run      [file] <text> [k=v ...] [--exec]
                             route the request, fill the skill's command from
                             k=v inputs, print it; --exec runs it

  [file] defaults to ${DEFAULT_FILE}
examples:
  bun run src/cli.ts manifest
  bun run src/cli.ts route "find every TODO in the tree"
  bun run src/cli.ts get search
  bun run src/cli.ts run "find every TODO" pattern=TODO path=src
  bun run src/cli.ts run "find every TODO" pattern=TODO path=src --exec`;

function fail(msg: string): never {
  console.error(msg + "\n\n" + USAGE);
  process.exit(1);
}

// Split an optional leading file argument from the rest.
function splitFile(args: string[]): { file: string; rest: string[] } {
  const a = args[0];
  if (a && (a.endsWith(".3md") || existsSync(a))) return { file: a, rest: args.slice(1) };
  return { file: DEFAULT_FILE, rest: args };
}

function load(file: string): Agent {
  if (!existsSync(file)) fail(`no such file: ${file}`);
  return new Agent(readFileSync(file, "utf8"));
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") { console.log(USAGE); process.exit(0); }

// `new` writes a fresh agent rather than loading one, so handle it before the
// file-loading path. Usage: new <name> [outfile]
if (cmd === "new") {
  const name = rest[0];
  if (!name) fail("new needs a name, e.g. new my-agent");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";
  const outfile = rest[1] ?? `${slug}.3md`;
  if (existsSync(outfile)) fail(`refusing to overwrite existing file: ${outfile}`);
  const scaffold = `---
3md: 1.0
axis: skill
agent: ${slug}
persona: terminal-first; reach for one precise command instead of reading files
tools: rg, jq
---
${name} is an agent packaged as one 3md file: plane 0 is the agent, every other
plane is a skill, loaded on demand. Each skill binds to a real command and
declares its typed inputs, so routing a request yields a command you can run.

@plane z=0 label="${name}" kind=identity
# ${name}

Operating rules. Route each task to the skill whose triggers match, load that
plane only, fill its inputs, then run its command.

@plane z=1 label="search" kind=skill triggers="search, find, grep, code" inputs="pattern:string, path:string" tool="rg --line-number {pattern} {path}"
# Skill: search

Find code by regex. Prefer this over reading whole files. Fill {pattern} and
{path}, then run.

@plane z=2 label="json" kind=skill triggers="json, jq, query, field" inputs="filter:string, file:string" tool="jq {filter} {file}"
# Skill: json

Query or reshape a JSON file. Fill {filter} (a jq program) and {file}.
`;
  writeFileSync(outfile, scaffold);
  console.log(`wrote ${outfile}`);
  console.log(`next:`);
  console.log(`  bun run src/validate.ts ${outfile}                 # check it conforms`);
  console.log(`  bun run src/cli.ts run ${outfile} "find every TODO" pattern=TODO path=src`);
  console.log(`  bun run src/mcp.ts ${outfile}                      # serve its skills over MCP`);
  process.exit(0);
}

const { file, rest: args } = splitFile(rest);

switch (cmd) {
  case "manifest": {
    const m = load(file).manifest();
    console.log(`${m.name}${m.model && m.model !== "unknown" ? `  (${m.model})` : ""}`);
    if (m.persona) console.log(`  persona: ${m.persona}`);
    console.log(`  tools:   ${m.tools.join(", ") || "(none)"}`);
    console.log(`  skills:  ${m.skills.length}`);
    for (const s of m.skills) {
      console.log(`    - ${s.name}${s.cost ? ` [${s.cost}]` : ""}${s.tool ? `  ->  ${s.tool}` : ""}`);
      console.log(`        triggers: ${s.triggers.join(", ")}`);
    }
    break;
  }
  case "skills": {
    for (const s of load(file).manifest().skills) console.log(s.name);
    break;
  }
  case "route": {
    const text = args.join(" ").trim();
    if (!text) fail("route needs a request, e.g. route \"summarize this\"");
    const agent = load(file);
    const ranked = agent.route(text);
    if (!ranked.length) { console.log(`no skill matched: "${text}"`); break; }
    console.log(`request: "${text}"`);
    ranked.forEach((r, i) => {
      const tag = i === 0 ? "->" : "  ";
      console.log(`  ${tag} ${r.skill.name}  (score ${r.score}; matched: ${r.hits.join(", ")})`);
    });
    const chain = agent.resolve(ranked[0].skill.name).map((s) => s.name);
    console.log(`  loads: ${chain.join(" + ")}`);
    break;
  }
  case "get": {
    const name = args.join(" ").trim();
    if (!name) fail("get needs a skill name, e.g. get search");
    const skill = load(file).get(name);
    if (!skill) fail(`no such skill: ${name}`);
    const fmtInputs = skill.inputSchema.map((x) => `${x.name}:${x.type}${x.required ? "" : "?"}`).join(", ");
    const meta = [
      skill.cost ? `cost=${skill.cost}` : "",
      skill.tool ? `tool=${skill.tool}` : "",
      fmtInputs ? `inputs=${fmtInputs}` : "",
    ].filter(Boolean).join(", ");
    console.log(`# ${skill.name}  (z=${skill.z}${meta ? `, ${meta}` : ""})`);
    console.log(skill.body);
    break;
  }
  case "resolve": {
    const name = args.join(" ").trim();
    if (!name) fail("resolve needs a skill name, e.g. resolve search");
    const agent = load(file);
    if (!agent.get(name)) fail(`no such skill: ${name}`);
    const chain = agent.resolve(name);
    console.log(`${name} loads ${chain.length} plane(s):`);
    for (const s of chain) console.log(`  - ${s.name}${s.deps.length ? `  (-> ${s.deps.join(",")})` : ""}`);
    break;
  }
  case "run": {
    const exec = args.includes("--exec");
    const values: Record<string, string> = Object.create(null);
    const words: string[] = [];
    for (const a of args) {
      if (a === "--exec") continue;
      const kv = a.match(/^([a-zA-Z_]\w*)=([\s\S]*)$/);
      if (kv) values[kv[1]] = kv[2];
      else words.push(a);
    }
    const text = words.join(" ").trim();
    if (!text) fail('run needs a request, e.g. run "find every TODO" pattern=TODO path=src');
    const agent = load(file);
    const ranked = agent.route(text);
    if (!ranked.length) { console.log(`no skill matched: "${text}"`); break; }
    const top = ranked[0].skill;
    console.log(`request: "${text}"`);
    console.log(`  -> ${top.name}  (matched: ${ranked[0].hits.join(", ")})`);
    const chain = agent.resolve(top.name).map((s) => s.name);
    if (chain.length > 1) console.log(`  loads: ${chain.join(" + ")}`);
    if (!top.tool) {
      console.log(`  (no command bound; this skill is guidance only)\n`);
      console.log(top.body);
      break;
    }
    const missing = commandPlaceholders(top.tool).filter((p) => !(p in values));
    const command = agent.command(top.name, values)!;
    console.log(`  command: ${command}`);
    if (missing.length) console.log(`  fill:    ${missing.map((m) => `${m}=`).join(" ")}`);
    if (exec) {
      if (missing.length) fail(`cannot --exec: missing values for ${missing.join(", ")}`);
      console.log(`  --- exec ---`);
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync(command, { shell: true, stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
    break;
  }
  default:
    fail(`unknown command: ${cmd}`);
}
