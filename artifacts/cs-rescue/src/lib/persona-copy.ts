import type { Persona } from "./persona-data";

/** One-liner shown under page titles to teach "why this matters for me right now." */
export const PERSONA_PAGE_COPY: Record<Persona, { architecture: string; resources: string }> = {
  vp: {
    architecture: "Where risk, readiness, and growth converge across the customer lifecycle.",
    resources: "Systems your business runs on — and where exposure or leverage actually lives.",
  },
  sales: {
    architecture: "What closes deals faster, where scope risk hides, and what hand-off looks like.",
    resources: "The systems prospects ask about — CRM, security, integrations.",
  },
  "post-sales": {
    architecture: "What drives a clean rollout and time-to-value, milestone by milestone.",
    resources: "The systems your implementation depends on going live cleanly.",
  },
  cs: {
    architecture: "What impacts adoption, renewal, and expansion across the lifecycle.",
    resources: "The systems generating the adoption, usage, and risk signals you act on.",
  },
  support: {
    architecture: "Where issues originate, how they propagate, and which teams own them.",
    resources: "The systems behind your case volume, knowledge, and escalation paths.",
  },
  engineering: {
    architecture: "How systems connect, fail, and recover — and what's degraded right now.",
    resources: "The platform inventory: data, identity, APIs, storage, observability.",
  },
  customer: {
    architecture: "What you actually feel — handoffs, delays, friction, and the people behind your rollout.",
    resources: "The tools your team touches and the ones working quietly in the background.",
  },
};
