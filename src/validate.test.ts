import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { validateAgent } from "./validate";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const rules = (r: ReturnType<typeof validateAgent>) => r.errors.map((e) => e.rule);

test("the real agent.3md passes validation", () => {
  const r = validateAgent(read("../agent.3md"));
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
});

// Note: a document with no `kind=identity` is VALID (the first plane is the
// identity by fallback). See conformance/valid-fallback-identity.3md. The
// identity rule only errors on >1 explicit identity (invalid-two-identities).

test("dead-link fixture is caught by the dead-link rule", () => {
  const r = validateAgent(read("../examples/invalid/dead-link.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("dead-link");
});

test("dup-skill fixture is caught by the unique-skill rule", () => {
  const r = validateAgent(read("../examples/invalid/dup-skill.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("unique-skill");
});

test("fallback identity (no kind=identity) is valid", () => {
  const r = validateAgent(read("../examples/conformance/valid-fallback-identity.3md"));
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
});

test("missing-label fixture is caught", () => {
  const r = validateAgent(read("../examples/conformance/invalid-missing-label.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("missing-label");
});

test("dependency cycle is caught", () => {
  const r = validateAgent(read("../examples/conformance/invalid-cycle.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("cycle");
});

test("two-identities fixture is caught by the identity rule", () => {
  const r = validateAgent(read("../examples/conformance/invalid-two-identities.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("identity");
});

test("bad-entry fixture is caught by the entry rule", () => {
  const r = validateAgent(read("../examples/conformance/invalid-bad-entry.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("entry");
});

test("typed inputs + tool binding fixture is valid", () => {
  const r = validateAgent(read("../examples/conformance/valid-typed-inputs.3md"));
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
});

test("a non-canonical input type is caught by the input-type rule", () => {
  const r = validateAgent(read("../examples/conformance/invalid-bad-input-type.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("input-type");
});

test("a duplicate input name is caught by the dup-input rule", () => {
  const r = validateAgent(read("../examples/conformance/invalid-dup-input.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("dup-input");
});

test("a command-backed skill is valid when placeholders match inputs", () => {
  const r = validateAgent(read("../examples/conformance/valid-command.3md"));
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
});

test("a command placeholder with no matching input is caught by tool-input", () => {
  const r = validateAgent(read("../examples/conformance/invalid-bad-placeholder.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("tool-input");
});

test("a missing agent name is caught by the frontmatter rule", () => {
  const r = validateAgent(read("../examples/conformance/invalid-missing-frontmatter.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("frontmatter");
});

test("model is optional (an agent with no model still validates)", () => {
  const r = validateAgent(read("../agent.3md"));
  expect(r.ok).toBe(true);
});
