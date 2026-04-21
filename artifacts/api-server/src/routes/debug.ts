import { Router, type IRouter, type Request, type Response } from "express";
import {
  architectureNodes,
  resources,
  connectors,
  deployments,
  accounts,
  lifecycleMotions,
} from "../data/mockData.js";
import { architectureEdges } from "../data/graphData.js";

const graphData = { edges: architectureEdges };

const router: IRouter = Router();

// ── AI Copilot context (mirrors artifacts/cs-rescue/src/services/ai/generateBriefing.ts)
// Kept here so the debug snapshot is self-describing for an external reviewer
// that cannot execute the SPA's JavaScript.
const PERSONAS = [
  { id: "vp", label: "VP / Executive" },
  { id: "sales", label: "Sales / AE" },
  { id: "post-sales", label: "Post-Sales / Implementation" },
  { id: "cs", label: "Customer Success" },
  { id: "support", label: "Support" },
  { id: "engineering", label: "Engineering" },
  { id: "customer", label: "Customer (outside-in)" },
];

const GOALS = [
  "Executive Review",
  "Deal Strategy",
  "Rollout Checkpoint",
  "Renewal Risk Review",
  "Support Escalation Review",
  "Technical Dependency Review",
];

const PERSONA_LENS: Record<
  string,
  { audience: string; focus: string; tone: string; nodeBias: string[] }
> = {
  vp: {
    audience: "executive sponsor",
    focus: "business impact, deployment risk, adoption health",
    tone: "concise, outcome-oriented",
    nodeBias: ["node-implementation", "node-csm", "node-deployment-intelligence", "node-analytics"],
  },
  sales: {
    audience: "account executive",
    focus: "deal readiness, scope risk, handoff confidence",
    tone: "commercial, urgency-aware",
    nodeBias: ["node-pre-sales", "node-contract", "node-implementation", "node-crm", "node-partner-hub"],
  },
  "post-sales": {
    audience: "implementation lead",
    focus: "rollout health, milestones, blockers, enablement",
    tone: "operational, milestone-driven",
    nodeBias: ["node-implementation", "node-forward-deployed", "node-lifecycle-playbooks", "node-deployment-intelligence"],
  },
  cs: {
    audience: "customer success manager",
    focus: "adoption, renewal risk, expansion signals",
    tone: "relationship-led, proactive",
    nodeBias: ["node-csm", "node-analytics", "node-lifecycle-playbooks", "node-crm", "node-support"],
  },
  support: {
    audience: "support lead",
    focus: "case volume, escalations, impacted systems",
    tone: "operational, root-cause oriented",
    nodeBias: ["node-support", "node-case-management", "node-document", "node-api-gateway"],
  },
  engineering: {
    audience: "platform engineering lead",
    focus: "dependencies, degraded systems, integration risk",
    tone: "technical, dependency-aware",
    nodeBias: ["node-api-gateway", "node-data-orchestration", "node-decisioning", "node-deployment-intelligence", "node-compliance"],
  },
  customer: {
    audience: "customer (outside-in view)",
    focus: "what you experience: handoffs, delays, friction, and who supports you",
    tone: "plain, experience-oriented",
    nodeBias: ["node-implementation", "node-csm", "node-support", "node-forward-deployed", "node-lifecycle-playbooks"],
  },
};

const ROUTES = [
  { method: "GET", path: "/api/healthz", description: "Liveness probe." },
  { method: "GET", path: "/api/architecture", description: "List architecture nodes (paginated)." },
  { method: "GET", path: "/api/architecture/nodes", description: "List nodes with filters (layer, lifecycleMotionId, persona)." },
  { method: "GET", path: "/api/architecture/nodes/:id", description: "Single node detail." },
  { method: "GET", path: "/api/architecture/summary", description: "Architecture summary KPIs." },
  { method: "GET", path: "/api/graph", description: "Full nodes + edges graph payload." },
  { method: "GET", path: "/api/edges", description: "Just the edges." },
  { method: "GET", path: "/api/metrics/:nodeId", description: "Node KPI/metrics rollup." },
  { method: "GET", path: "/api/resources", description: "List underlying systems / resources." },
  { method: "GET", path: "/api/resources/:id", description: "Single resource detail." },
  { method: "GET", path: "/api/connectors", description: "List integration connectors." },
  { method: "GET", path: "/api/connectors/:id", description: "Single connector detail." },
  { method: "GET", path: "/api/connectors/health", description: "Aggregate connector health." },
  { method: "GET", path: "/api/deployments", description: "List rollouts in flight." },
  { method: "GET", path: "/api/deployments/:id", description: "Single deployment detail." },
  { method: "GET", path: "/api/accounts", description: "List customer accounts." },
  { method: "GET", path: "/api/lifecycle-motions", description: "Lifecycle motion definitions." },
  { method: "GET", path: "/api/debug/state", description: "This endpoint — full data + AI Copilot context (Accept: text/html for human view)." },
];

function buildSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      personas: PERSONAS.length,
      goals: GOALS.length,
      architectureNodes: architectureNodes.length,
      edges: graphData.edges.length,
      resources: resources.length,
      connectors: connectors.length,
      deployments: deployments.length,
      accounts: accounts.length,
      lifecycleMotions: lifecycleMotions.length,
    },
    aiCopilot: {
      personas: PERSONAS,
      goals: GOALS,
      personaLens: PERSONA_LENS,
      contract: {
        input: {
          persona: "one of: " + PERSONAS.map((p) => p.id).join(" | "),
          accountId: "string | null",
          deploymentId: "string | null",
          goal: "one of GOALS",
          prompt: "optional freeform string",
        },
        output: {
          summary: "string",
          priorities: "string[]",
          risks: "string[]",
          opportunities: "string[]",
          recommendedNodeIds: "string[] (architecture node ids to highlight)",
          recommendedResourceIds: "string[]",
          walkthroughSteps: "string[]",
          nextActions: "string[]",
        },
        notes:
          "Briefings are produced by a deterministic mock generator today (artifacts/cs-rescue/src/services/ai/generateBriefing.ts). The contract is stable and the function body is the swap point for a real LLM.",
      },
    },
    routes: ROUTES,
    data: {
      personas: PERSONAS,
      goals: GOALS,
      lifecycleMotions,
      accounts,
      deployments,
      connectors,
      resources,
      architectureNodes,
      edges: graphData.edges,
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(snapshot: ReturnType<typeof buildSnapshot>): string {
  const s = snapshot.summary;
  const sumRow = (label: string, value: number) =>
    `<tr><th scope="row">${escapeHtml(label)}</th><td>${value}</td></tr>`;

  const routeRows = snapshot.routes
    .map(
      (r) =>
        `<tr><td><code>${escapeHtml(r.method)}</code></td><td><code>${escapeHtml(
          r.path,
        )}</code></td><td>${escapeHtml(r.description)}</td></tr>`,
    )
    .join("");

  const personaList = snapshot.aiCopilot.personas
    .map((p) => {
      const lens = snapshot.aiCopilot.personaLens[p.id];
      return `<li><strong>${escapeHtml(p.label)}</strong> (<code>${escapeHtml(p.id)}</code>) — audience: ${escapeHtml(
        lens?.audience ?? "",
      )}; focus: ${escapeHtml(lens?.focus ?? "")}; tone: ${escapeHtml(lens?.tone ?? "")}.</li>`;
    })
    .join("");

  const goalList = snapshot.aiCopilot.goals
    .map((g) => `<li>${escapeHtml(g)}</li>`)
    .join("");

  const nodeRows = snapshot.data.architectureNodes
    .map(
      (n) =>
        `<tr><td><code>${escapeHtml(n.id)}</code></td><td>${escapeHtml(n.name)}</td><td>${escapeHtml(
          n.layer,
        )}</td><td>${escapeHtml(n.ownerTeam)}</td><td>${escapeHtml(String(n.healthScore ?? ""))}</td><td>${escapeHtml(
          n.status,
        )}</td><td>${escapeHtml(n.shortDescription)}</td></tr>`,
    )
    .join("");

  const accountRows = snapshot.data.accounts
    .map(
      (a) =>
        `<tr><td><code>${escapeHtml(a.id)}</code></td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(
          a.segment,
        )}</td><td>${escapeHtml(a.lifecycleStage)}</td><td>${escapeHtml(a.owner)}</td><td>${escapeHtml(
          a.status,
        )}</td></tr>`,
    )
    .join("");

  const deploymentRows = snapshot.data.deployments
    .map(
      (d) =>
        `<tr><td><code>${escapeHtml(d.id)}</code></td><td>${escapeHtml(d.name)}</td><td>${escapeHtml(
          d.accountName,
        )}</td><td>${escapeHtml(d.stage)}</td><td>${d.healthScore}</td><td>${
          d.blockers?.length ?? 0
        }</td><td>${d.milestones?.length ?? 0}</td></tr>`,
    )
    .join("");

  const resourceRows = snapshot.data.resources
    .map(
      (r) =>
        `<tr><td><code>${escapeHtml(r.id)}</code></td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(
          r.category,
        )}</td><td>${escapeHtml(r.vendor)}</td><td>${escapeHtml(r.environment)}</td><td>${escapeHtml(
          r.status,
        )}</td><td>${escapeHtml(r.owner)}</td></tr>`,
    )
    .join("");

  const lifecycleRows = snapshot.data.lifecycleMotions
    .map(
      (l) =>
        `<tr><td><code>${escapeHtml(l.id)}</code></td><td>${escapeHtml(l.name)}</td><td>${escapeHtml(
          l.description,
        )}</td><td>${l.nodeIds.length}</td></tr>`,
    )
    .join("");

  const edgeRows = snapshot.data.edges
    .slice(0, 100)
    .map(
      (e) =>
        `<tr><td><code>${escapeHtml(e.id)}</code></td><td><code>${escapeHtml(
          e.source,
        )}</code></td><td><code>${escapeHtml(e.target)}</code></td><td>${escapeHtml(
          e.relationshipType,
        )}</td><td>${escapeHtml(e.status)}</td><td>${escapeHtml(e.label ?? "")}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CS Rescue — Debug Snapshot</title>
<meta name="description" content="Server-rendered snapshot of CS Rescue data, routes, and AI Copilot context for non-JS reviewers." />
<meta name="robots" content="noindex" />
<style>
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #111; background: #fafafa; }
  h1 { margin-bottom: 0.25rem; }
  h2 { margin-top: 2.25rem; padding-top: 1rem; border-top: 1px solid #ddd; }
  h3 { margin-top: 1.5rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #eef; padding: 0 4px; border-radius: 3px; font-size: 0.92em; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; background: #fff; }
  th, td { border: 1px solid #ddd; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f1f3f5; }
  caption { caption-side: top; text-align: left; font-weight: 600; padding: 4px 0; }
  .meta { color: #555; font-size: 0.92em; }
  details { margin: 0.5rem 0 1rem; }
  summary { cursor: pointer; font-weight: 600; }
  pre { background: #f4f4f8; padding: 12px; overflow: auto; border-radius: 6px; font-size: 12px; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px; background: #e7f3ff; color: #0a558c; font-size: 0.82em; margin-right: 4px; }
</style>
</head>
<body>

<h1>CS Rescue — Debug Snapshot</h1>
<p class="meta">
  Server-rendered for reviewers that don't execute JavaScript. Generated at <code>${escapeHtml(
    snapshot.generatedAt,
  )}</code>.
  For raw JSON, request this URL with <code>Accept: application/json</code> or append <code>?format=json</code>.
</p>

<h2>1. Product overview</h2>
<p>
  CS Rescue is a dark-mode enterprise web app that visualizes a company's full customer lifecycle architecture.
  It is persona-aware (<span class="pill">VP</span><span class="pill">Sales</span><span class="pill">Post-Sales</span><span class="pill">CS</span><span class="pill">Support</span><span class="pill">Engineering</span>)
  with three view modes (<strong>Business</strong>, <strong>Dependency</strong>, <strong>Systems</strong>),
  plus an <strong>AI Copilot</strong> tab that generates persona-aware demo briefings from live architecture, account, and deployment data.
</p>

<h3>App routes (client-side, requires JS to render)</h3>
<ul>
  <li><code>/</code> — Architecture map (Business / Dependency / Systems views)</li>
  <li><code>/ai-copilot</code> — AI Copilot briefing generator</li>
  <li><code>/resources</code> — Underlying systems</li>
  <li><code>/deployments</code> — Rollouts in flight</li>
  <li><code>/connectors</code> — Integration health</li>
</ul>

<h2>2. Counts at a glance</h2>
<table>
  <caption>Summary</caption>
  <tbody>
    ${sumRow("Personas", s.personas)}
    ${sumRow("AI Copilot goals", s.goals)}
    ${sumRow("Architecture nodes", s.architectureNodes)}
    ${sumRow("Edges (dependencies)", s.edges)}
    ${sumRow("Resources / underlying systems", s.resources)}
    ${sumRow("Connectors", s.connectors)}
    ${sumRow("Deployments", s.deployments)}
    ${sumRow("Accounts", s.accounts)}
    ${sumRow("Lifecycle motions", s.lifecycleMotions)}
  </tbody>
</table>

<h2>3. AI Copilot — context &amp; contract</h2>
<h3>Personas</h3>
<ul>${personaList}</ul>
<h3>Briefing goals</h3>
<ul>${goalList}</ul>
<h3>Input → output contract</h3>
<pre>${escapeHtml(JSON.stringify(snapshot.aiCopilot.contract, null, 2))}</pre>
<p class="meta">
  The current generator (<code>artifacts/cs-rescue/src/services/ai/generateBriefing.ts</code>) is deterministic and mock-based.
  The exported function shape is stable so it can be swapped for a real LLM call without touching the UI.
</p>

<h2>4. API routes</h2>
<table>
  <caption>HTTP routes exposed by the API server</caption>
  <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
  <tbody>${routeRows}</tbody>
</table>

<h2>5. Architecture nodes (${snapshot.data.architectureNodes.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Name</th><th>Layer</th><th>Owner team</th><th>Health</th><th>Status</th><th>Description</th></tr></thead>
  <tbody>${nodeRows}</tbody>
</table>

<h2>6. Accounts (${snapshot.data.accounts.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Name</th><th>Segment</th><th>Lifecycle</th><th>Owner</th><th>Status</th></tr></thead>
  <tbody>${accountRows}</tbody>
</table>

<h2>7. Deployments (${snapshot.data.deployments.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Name</th><th>Account</th><th>Stage</th><th>Health</th><th>Blockers</th><th>Milestones</th></tr></thead>
  <tbody>${deploymentRows}</tbody>
</table>

<h2>8. Resources (${snapshot.data.resources.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Vendor</th><th>Env</th><th>Status</th><th>Owner</th></tr></thead>
  <tbody>${resourceRows}</tbody>
</table>

<h2>9. Lifecycle motions (${snapshot.data.lifecycleMotions.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Name</th><th>Description</th><th># nodes</th></tr></thead>
  <tbody>${lifecycleRows}</tbody>
</table>

<h2>10. Edges (showing first 100 of ${snapshot.data.edges.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Source</th><th>Target</th><th>Relationship</th><th>Status</th><th>Label</th></tr></thead>
  <tbody>${edgeRows}</tbody>
</table>

<h2>11. Full JSON dump</h2>
<details>
  <summary>Click to expand full JSON snapshot</summary>
  <pre>${escapeHtml(JSON.stringify(snapshot, null, 2))}</pre>
</details>

</body>
</html>`;
}

router.get("/debug/state", (req: Request, res: Response) => {
  const snapshot = buildSnapshot();
  const format = String(req.query.format ?? "").toLowerCase();
  const wantsJson = format === "json" || req.accepts(["html", "json"]) === "json";
  const wantsHtml = format === "html" || (!wantsJson && req.accepts(["html", "json"]) === "html");

  if (wantsHtml) {
    res.set("Cache-Control", "no-store");
    res.type("html").send(renderHtml(snapshot));
    return;
  }
  res.set("Cache-Control", "no-store");
  res.json(snapshot);
});

export default router;
