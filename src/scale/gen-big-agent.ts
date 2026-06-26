// Generate a synthetic agent.3md with N skills for the scaling benchmark.
//
// Honesty notes (this generator was rewritten after a review found the old one
// flattered the numbers):
//   - Skill bodies are realistic in size (~250-450 tokens): purpose, inputs, a
//     multi-step procedure, an example, and edge cases. Thin bodies inflate the
//     percentage savings, so we do NOT use thin bodies.
//   - Triggers are DISTINCT and meaningful: a unique verb per skill (the verb
//     pool is larger than N), the operated-on noun, and the "verb noun" phrase.
//     There are NO filler words ("please", "this") in triggers, so the test
//     requests cannot accidentally match every skill. Nouns are deliberately
//     SHARED across skills (many skills act on a "report"), so routing still has
//     to disambiguate on the verb, that overlap is realistic, not rigged.
//   - genTestSet() returns, per skill, a natural request and the correct skill
//     name, so the benchmark can measure ROUTING ACCURACY honestly.
import { writeFileSync, mkdirSync } from "node:fs";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

// 108 distinct verbs (> max N of 100), so each skill gets a unique primary verb.
const VERBS = [
  "search", "summarize", "translate", "classify", "extract", "render", "compile",
  "deploy", "encrypt", "compress", "schedule", "notify", "validate", "format",
  "parse", "scrape", "crawl", "index", "embed", "cluster", "rank", "dedupe",
  "merge", "split", "convert", "resize", "crop", "annotate", "transcribe",
  "caption", "diff", "patch", "lint", "refactor", "profile", "benchmark", "mock",
  "seed", "migrate", "backup", "restore", "sync", "upload", "download", "stream",
  "throttle", "retry", "cache", "reroute", "balance", "monitor", "alert", "log",
  "trace", "audit", "redact", "anonymize", "sign", "countersign", "authorize",
  "provision", "snapshot", "replicate", "shard", "partition", "aggregate",
  "pivot", "forecast", "simulate", "optimize", "solve", "sketch", "compose",
  "tag", "categorize", "recommend", "personalize", "segment", "price", "invoice",
  "reconcile", "budget", "estimate", "assign", "approve", "escalate", "triage",
  "diagnose", "rollback", "canary", "experiment", "measure", "visualize", "chart",
  "geocode", "navigate", "transcode", "watermark", "vectorize", "rasterize",
  "quantize", "calibrate", "interpolate", "extrapolate", "denoise", "upscale",
];
// shared nouns: reused across skills so the verb has to disambiguate.
const NOUNS = ["report", "image", "request", "record", "dataset", "stream", "event", "document", "query", "ledger", "manifest", "model", "asset", "ticket"];
const BACKENDS = ["the search index", "the object store", "a worker pool", "the warehouse", "the queue", "the cache tier", "the model server"];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function skillBody(verb: string, noun: string, backend: string, dep: boolean): string {
  return `# Skill: ${verb}-${noun}

Use this when the request is to ${verb} a ${noun}. It owns one job and does it
well; for anything outside that, route elsewhere.

**Inputs.** A ${noun} (an id, a path, or an inline payload) and optional
parameters: an output \`format\`, a \`limit\`, and a \`dryRun\` flag. Missing
parameters fall back to sane defaults; an ambiguous request should be clarified
before any side effect.

**Procedure.**

1. Validate the incoming ${noun}: confirm it exists, is well formed, and is
   within the size budget. Reject early with a specific error rather than a
   generic failure later.
2. Resolve options. If no \`format\` was given, infer it from the ${noun}; when
   the inference is ambiguous, ask instead of guessing.
3. ${cap(verb)} the ${noun} against ${backend}. Stream large inputs page by page
   rather than materializing the whole thing in memory.
4. Handle failures explicitly: a transient backend error retries with backoff up
   to three times; a permanent error surfaces the underlying cause, never a
   swallowed exception.
5. Assemble a structured result: the ${verb}ed ${noun}, a one line summary, and
   any warnings. Do not return partial output silently.

**Example.**

\`\`\`
request: "${verb} the Q3 ${noun} and keep it terse"
result:  { status: "ok", ${verb}ed: "<...>", warnings: [] }
\`\`\`

**Edge cases.** An empty ${noun} returns an empty result with a note, not an
error. A permission error confirms authorization before any retry. A ${noun}
that is already in the target state is a no op, report it as such.${dep ? `

For any external claim in the result, attach a source via [[z=1|cite-sources]].` : ""}`;
}

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
plane only, follow its dependency links, and confirm destructive actions.

@plane z=1 label="cite-sources" kind=skill triggers="cite source, attribution, reference" inputs="claims"
# Skill: cite-sources

Attach a verifiable source to every external claim; mark anything that cannot be
verified as unverified rather than dropping it.

`;

  for (let i = 2; i <= n; i++) {
    const verb = VERBS[(i - 2) % VERBS.length];
    const noun = NOUNS[(i - 2) % NOUNS.length];
    const name = `${verb}-${noun}`;
    const triggers = `${verb} ${noun}, ${verb}, ${noun}`;
    const dep = rand() < 0.25;
    out += `@plane z=${i} label="${name}" kind=skill triggers="${triggers}" inputs="${noun}"\n${skillBody(verb, noun, pick(BACKENDS), dep)}\n\n`;
  }
  return out;
}

/** A natural request per skill plus its correct name, for routing-accuracy. */
export function genTestSet(n: number, count = 24, seed = 7): { request: string; correct: string }[] {
  const rand = rng(seed + n);
  const set: { request: string; correct: string }[] = [];
  const lead = ["I need to", "Can you", "Please", "Go ahead and", "Help me"];
  const tail = ["for the team", "before the deadline", "and keep it short", "right away", ""];
  for (let k = 0; k < count; k++) {
    const i = 2 + Math.floor(rand() * (n - 1)); // skip identity(0) and shared cite-sources(1)
    const verb = VERBS[(i - 2) % VERBS.length];
    const noun = NOUNS[(i - 2) % NOUNS.length];
    const l = lead[Math.floor(rand() * lead.length)];
    const t = tail[Math.floor(rand() * tail.length)];
    set.push({ request: `${l} ${verb} the latest ${noun} ${t}`.trim(), correct: `${verb}-${noun}` });
  }
  return set;
}

if (import.meta.main) {
  const dir = new URL(".", import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  for (const n of [10, 25, 50, 100]) {
    const src = genAgent(n);
    writeFileSync(`${dir}agent-${n}.3md`, src);
    console.log(`wrote agent-${n}.3md (${src.length} chars)`);
  }
}
