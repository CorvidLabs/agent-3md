// Tier-2 routing helper. Instead of carrying the whole skill catalog in the
// model's context, the agent calls this as a TOOL: the trigger index lives
// "server-side" (in the loader), the request goes out, and only skill names
// come back. The model then loads just those skill planes. This keeps per-turn
// context independent of how many skills the agent has.
import type { Agent } from "./runtime";

/** Out-of-context index lookup: request text -> matching skill names, ranked. */
export function routeQuery(agent: Agent, text: string): string[] {
  return agent.route(text).map((r) => r.skill.name);
}
