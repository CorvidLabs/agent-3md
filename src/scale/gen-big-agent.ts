// Generate a synthetic-but-realistic agent.3md with N skills, to test whether
// progressive disclosure keeps saving tokens as the skill library grows.
// Each skill = one @plane with a unique name, a few trigger words, a short
// realistic body, and (occasionally) a [[z=N|..]] dependency on a shared skill.
import { writeFileSync, mkdirSync } from "node:fs";

// small seeded PRNG so output is deterministic/reproducible
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

// a verb pool: each skill is built around one verb (its primary trigger)
const VERBS = [
  "search", "summarize", "translate", "classify", "extract", "render", "compile",
  "deploy", "encrypt", "compress", "schedule", "notify", "validate", "format",
  "parse", "scrape", "crawl", "index", "embed", "cluster", "rank", "dedupe",
  "merge", "split", "convert", "resize", "crop", "annotate", "transcribe",
  "caption", "diff", "patch", "lint", "refactor", "profile", "benchmark", "mock",
  "seed", "migrate", "backup", "restore", "sync", "upload", "download", "stream",
  "throttle", "retry", "cache", "route", "balance", "monitor", "alert", "log",
  "trace", "audit", "redact", "anonymize", "sign", "verify", "authorize",
  "provision", "snapshot", "replicate", "shard", "partition", "aggregate",
  "pivot", "forecast", "simulate", "optimize", "solve", "sketch", "compose",
  "tag", "categorize", "recommend", "personalize", "segment", "price", "invoice",
  "reconcile", "budget", "estimate", "assign", "approve", "escalate", "triage",
  "diagnose", "rollback", "canary", "experiment", "measure", "visualize", "chart",
  "geocode", "navigate", "transcode", "watermark", "vectorize", "rasterize",
  "quantize", "calibrate", "interpolate", "extrapolate", "denoise", "upscale",
];

const NOUNS = ["data", "file", "request", "record", "image", "report", "stream", "event", "doc", "query", "table", "model", "asset", "ticket"];

export function genAgent(n: number, seed = 42): string {
  const rand = rng(seed + n);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  let out = `---
3md: 1.0
axis: skill
title: Atlas-${n}
agent: atlas
model: claude-opus-4-8
version: "1.0"
tools: web, bash, fs
entry: "0"
note: synthetic agent with ${n} skills, for the scaling benchmark.
---
A research-and-build agent packaged as one 3md document with ${n} skills. The
runtime loads only the skill plane a request needs.

@plane z=0 label="Atlas" kind=identity
# Atlas

A careful agent. Route each task to the skill whose triggers match, load that
plane only, and follow its dependency links. Confirm destructive actions.

`;

  // a shared "cite-sources"-style skill that others depend on lives at z=1
  out += `@plane z=1 label="cite-sources" kind=skill triggers="cite, source, reference, attribution" inputs="claims"
# Skill: cite-sources

Attach a verifiable source to every external claim; mark anything unverified.

`;

  for (let i = 2; i <= n; i++) {
    const verb = VERBS[(i - 2) % VERBS.length];
    const noun = pick(NOUNS);
    const name = `${verb}-${noun}`;
    // a few trigger words: the verb plus 2-3 related tokens
    const triggers = [verb, noun, `${verb} ${noun}`, pick(["now", "this", "please", "auto", "batch"])].join(", ");
    const dep = rand() < 0.25 ? `\n- cross-check results against [[z=1|cite-sources]].` : "";
    out += `@plane z=${i} label="${name}" kind=skill triggers="${triggers}" inputs="${noun}"
# Skill: ${name}

${cap(verb)} the ${noun}. Steps:

1. Validate the incoming ${noun} and its parameters.
2. ${cap(verb)} it using the appropriate backend/tool.
3. Return a structured result the caller can act on.${dep}

`;
  }
  return out;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// standalone: write the four sizes as artifacts
if (import.meta.main) {
  const dir = new URL(".", import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  for (const n of [10, 25, 50, 100]) {
    const src = genAgent(n);
    writeFileSync(`${dir}agent-${n}.3md`, src);
    console.log(`wrote agent-${n}.3md (${src.length} chars)`);
  }
}
