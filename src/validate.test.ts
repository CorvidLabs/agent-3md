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

test("no-identity fixture is caught by the identity rule", () => {
  const r = validateAgent(read("../examples/invalid/no-identity.3md"));
  expect(r.ok).toBe(false);
  expect(rules(r)).toContain("identity");
});

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
