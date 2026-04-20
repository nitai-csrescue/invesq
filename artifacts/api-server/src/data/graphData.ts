import type {
  ArchitectureEdge,
  ArchitectureGroup,
  NodeMetricSeries,
  MetricPoint,
} from "@workspace/api-zod";

export const architectureGroups: ArchitectureGroup[] = [
  {
    id: "grp-lifecycle",
    name: "Lifecycle Motions",
    layer: "lifecycle",
    nodeIds: [
      "node-pre-sales",
      "node-contract",
      "node-implementation",
      "node-csm",
      "node-support",
    ],
    color: "#6366f1",
  },
  {
    id: "grp-delivery",
    name: "Delivery & Orchestration",
    layer: "delivery",
    nodeIds: [
      "node-forward-deployed",
      "node-lifecycle-playbooks",
      "node-deployment-intelligence",
    ],
    color: "#3b82f6",
  },
  {
    id: "grp-platform",
    name: "Shared Platform / Systems",
    layer: "platform",
    nodeIds: [
      "node-data-orchestration",
      "node-decisioning",
      "node-compliance",
      "node-partner-hub",
      "node-analytics",
      "node-crm",
      "node-case-management",
      "node-document",
      "node-api-gateway",
    ],
    color: "#06b6d4",
  },
];

export const architectureEdges: ArchitectureEdge[] = [
  // lifecycle chain
  { id: "e-pre-contract", source: "node-pre-sales", target: "node-contract", relationshipType: "dependency", label: "qualifies", strength: 9, status: "active" },
  { id: "e-contract-impl", source: "node-contract", target: "node-implementation", relationshipType: "dependency", label: "kicks off", strength: 10, status: "active" },
  { id: "e-impl-csm", source: "node-implementation", target: "node-csm", relationshipType: "dependency", label: "hands off", strength: 9, status: "active" },
  { id: "e-csm-support", source: "node-csm", target: "node-support", relationshipType: "dependency", label: "escalates", strength: 7, status: "active" },

  // lifecycle -> delivery
  { id: "e-pre-fd", source: "node-pre-sales", target: "node-forward-deployed", relationshipType: "data_flow", label: "scoping", strength: 6, status: "active" },
  { id: "e-impl-fd", source: "node-implementation", target: "node-forward-deployed", relationshipType: "composition", label: "staffs", strength: 9, status: "active" },
  { id: "e-impl-pb", source: "node-implementation", target: "node-lifecycle-playbooks", relationshipType: "control", label: "executes", strength: 8, status: "active" },
  { id: "e-csm-pb", source: "node-csm", target: "node-lifecycle-playbooks", relationshipType: "control", label: "triggers", strength: 8, status: "active" },

  // delivery internals
  { id: "e-fd-di", source: "node-forward-deployed", target: "node-deployment-intelligence", relationshipType: "data_flow", label: "telemetry", strength: 7, status: "active" },
  { id: "e-pb-dec", source: "node-lifecycle-playbooks", target: "node-decisioning", relationshipType: "data_flow", label: "rules", strength: 8, status: "active" },
  { id: "e-di-dec", source: "node-deployment-intelligence", target: "node-decisioning", relationshipType: "data_flow", label: "signals", strength: 7, status: "degraded" },

  // delivery -> platform
  { id: "e-fd-do", source: "node-forward-deployed", target: "node-data-orchestration", relationshipType: "data_flow", label: "events", strength: 6, status: "active" },
  { id: "e-di-an", source: "node-deployment-intelligence", target: "node-analytics", relationshipType: "data_flow", label: "metrics", strength: 8, status: "active" },

  // platform interconnects
  { id: "e-do-an", source: "node-data-orchestration", target: "node-analytics", relationshipType: "sync", label: "feeds", strength: 9, status: "active" },
  { id: "e-do-dec", source: "node-data-orchestration", target: "node-decisioning", relationshipType: "data_flow", label: "features", strength: 7, status: "active" },
  { id: "e-do-api", source: "node-data-orchestration", target: "node-api-gateway", relationshipType: "sync", label: "stream", strength: 9, status: "active" },
  { id: "e-api-comp", source: "node-api-gateway", target: "node-compliance", relationshipType: "control", label: "audited by", strength: 8, status: "active" },
  { id: "e-api-partner", source: "node-api-gateway", target: "node-partner-hub", relationshipType: "composition", label: "exposes", strength: 6, status: "active" },
  { id: "e-crm-do", source: "node-crm", target: "node-data-orchestration", relationshipType: "sync", label: "syncs", strength: 9, status: "active" },
  { id: "e-crm-pre", source: "node-crm", target: "node-pre-sales", relationshipType: "data_flow", label: "accounts", strength: 8, status: "active" },
  { id: "e-cm-do", source: "node-case-management", target: "node-data-orchestration", relationshipType: "data_flow", label: "tickets", strength: 7, status: "active" },
  { id: "e-support-cm", source: "node-support", target: "node-case-management", relationshipType: "composition", label: "uses", strength: 9, status: "active" },
  { id: "e-doc-contract", source: "node-document", target: "node-contract", relationshipType: "data_flow", label: "templates", strength: 6, status: "active" },
  { id: "e-doc-support", source: "node-document", target: "node-support", relationshipType: "data_flow", label: "kb", strength: 6, status: "active" },
  { id: "e-doc-cm", source: "node-document", target: "node-case-management", relationshipType: "data_flow", label: "attachments", strength: 5, status: "active" },
  { id: "e-partner-crm", source: "node-partner-hub", target: "node-crm", relationshipType: "sync", label: "co-sell", strength: 6, status: "active" },
  { id: "e-comp-do", source: "node-compliance", target: "node-data-orchestration", relationshipType: "control", label: "policies", strength: 7, status: "active" },
];

// Health scores per node id
export const nodeHealthScores: Record<string, number> = {
  "node-pre-sales": 88,
  "node-contract": 92,
  "node-implementation": 74,
  "node-csm": 91,
  "node-support": 67,
  "node-forward-deployed": 82,
  "node-lifecycle-playbooks": 89,
  "node-deployment-intelligence": 76,
  "node-data-orchestration": 96,
  "node-decisioning": 84,
  "node-compliance": 98,
  "node-partner-hub": 79,
  "node-analytics": 93,
  "node-crm": 95,
  "node-case-management": 71,
  "node-document": 86,
  "node-api-gateway": 99,
};

// Suggested xy positions for a clean swimlane layout (4 lifecycle rows scaled)
export const nodePositions: Record<string, { x: number; y: number }> = {
  // lifecycle row (y ~ 60)
  "node-pre-sales": { x: 80, y: 80 },
  "node-contract": { x: 320, y: 80 },
  "node-implementation": { x: 560, y: 80 },
  "node-csm": { x: 800, y: 80 },
  "node-support": { x: 1040, y: 80 },
  // delivery row (y ~ 280)
  "node-forward-deployed": { x: 200, y: 320 },
  "node-lifecycle-playbooks": { x: 560, y: 320 },
  "node-deployment-intelligence": { x: 920, y: 320 },
  // platform row (y ~ 540)
  "node-crm": { x: 60, y: 580 },
  "node-data-orchestration": { x: 320, y: 580 },
  "node-decisioning": { x: 580, y: 580 },
  "node-analytics": { x: 840, y: 580 },
  "node-api-gateway": { x: 1100, y: 580 },
  // platform row 2 (y ~ 760)
  "node-document": { x: 60, y: 800 },
  "node-case-management": { x: 320, y: 800 },
  "node-compliance": { x: 580, y: 800 },
  "node-partner-hub": { x: 840, y: 800 },
};

// Metric series generator
function makePoints(values: number[], startMs: number, stepDays = 1): MetricPoint[] {
  return values.map((v, i) => ({
    timestamp: new Date(startMs + i * stepDays * 86400000).toISOString(),
    value: v,
    label: `D${i + 1}`,
  }));
}

const start = new Date("2026-04-01T00:00:00Z").getTime();

export const nodeMetrics: Record<string, NodeMetricSeries[]> = {
  "node-pre-sales": [
    {
      id: "m-pre-conv", nodeId: "node-pre-sales", metricName: "Conversion Rate", unit: "%",
      chartType: "line", trendDirection: "up", currentValue: 34, delta: 4,
      points: makePoints([28, 29, 27, 30, 31, 30, 32, 31, 33, 32, 34, 33, 34, 34], start),
    },
    {
      id: "m-pre-cycle", nodeId: "node-pre-sales", metricName: "Avg Cycle Time", unit: "days",
      chartType: "bar", trendDirection: "flat", currentValue: 42, delta: 0,
      points: makePoints([45, 44, 43, 42, 43, 42, 41, 42, 42, 41, 42, 42, 42, 42], start),
    },
    {
      id: "m-pre-ready", nodeId: "node-pre-sales", metricName: "Readiness Score", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 88,
      points: [{ timestamp: new Date().toISOString(), value: 88 }],
    },
  ],
  "node-contract": [
    {
      id: "m-c-tts", nodeId: "node-contract", metricName: "Time-to-Sign", unit: "days",
      chartType: "line", trendDirection: "down", currentValue: 8.3, delta: -1.2,
      points: makePoints([11, 10.5, 10, 9.8, 9.5, 9.2, 9, 8.8, 8.6, 8.5, 8.4, 8.3, 8.3, 8.3], start),
    },
    {
      id: "m-c-vol", nodeId: "node-contract", metricName: "Contracts Signed", unit: "count",
      chartType: "bar", trendDirection: "up", currentValue: 12,
      points: makePoints([8, 9, 11, 10, 12, 13, 12, 14, 13, 12, 14, 15, 13, 12], start),
    },
    {
      id: "m-c-health", nodeId: "node-contract", metricName: "Contract Health", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 92,
      points: [{ timestamp: new Date().toISOString(), value: 92 }],
    },
  ],
  "node-implementation": [
    {
      id: "m-i-launch", nodeId: "node-implementation", metricName: "Launch Readiness", unit: "%",
      chartType: "line", trendDirection: "up", currentValue: 74, delta: 6,
      points: makePoints([55, 58, 60, 63, 64, 66, 68, 70, 71, 72, 73, 73, 74, 74], start),
    },
    {
      id: "m-i-blockers", nodeId: "node-implementation", metricName: "Blockers by Category", unit: "count",
      chartType: "bar", trendDirection: "down", currentValue: 7,
      points: [
        { timestamp: "data", value: 3, label: "Data" },
        { timestamp: "auth", value: 2, label: "Auth" },
        { timestamp: "api", value: 1, label: "API" },
        { timestamp: "ux", value: 1, label: "UX" },
      ],
    },
    {
      id: "m-i-health", nodeId: "node-implementation", metricName: "Deployment Health", unit: "%",
      chartType: "radial", trendDirection: "flat", currentValue: 74,
      points: [{ timestamp: new Date().toISOString(), value: 74 }],
    },
  ],
  "node-csm": [
    {
      id: "m-csm-nrr", nodeId: "node-csm", metricName: "NRR", unit: "%",
      chartType: "line", trendDirection: "up", currentValue: 118, delta: 5,
      points: makePoints([108, 110, 111, 112, 113, 114, 114, 115, 116, 116, 117, 118, 118, 118], start),
    },
    {
      id: "m-csm-csat", nodeId: "node-csm", metricName: "CSAT", unit: "/5",
      chartType: "bar", trendDirection: "up", currentValue: 4.6,
      points: makePoints([4.2, 4.3, 4.3, 4.4, 4.4, 4.5, 4.5, 4.5, 4.6, 4.6, 4.6, 4.6, 4.6, 4.6], start),
    },
    {
      id: "m-csm-health", nodeId: "node-csm", metricName: "Account Health", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 91,
      points: [{ timestamp: new Date().toISOString(), value: 91 }],
    },
  ],
  "node-support": [
    {
      id: "m-s-fr", nodeId: "node-support", metricName: "First Response Time", unit: "h",
      chartType: "line", trendDirection: "down", currentValue: 1.8, delta: -0.3,
      points: makePoints([2.4, 2.3, 2.3, 2.2, 2.1, 2.0, 2.0, 1.9, 1.9, 1.8, 1.8, 1.8, 1.8, 1.8], start),
    },
    {
      id: "m-s-tickets", nodeId: "node-support", metricName: "Tickets by Severity", unit: "count",
      chartType: "bar", currentValue: 27,
      points: [
        { timestamp: "p1", value: 2, label: "P1" },
        { timestamp: "p2", value: 7, label: "P2" },
        { timestamp: "p3", value: 12, label: "P3" },
        { timestamp: "p4", value: 6, label: "P4" },
      ],
    },
    {
      id: "m-s-health", nodeId: "node-support", metricName: "Support Health", unit: "%",
      chartType: "radial", trendDirection: "down", currentValue: 67,
      points: [{ timestamp: new Date().toISOString(), value: 67 }],
    },
  ],
  "node-forward-deployed": [
    {
      id: "m-fd-eng", nodeId: "node-forward-deployed", metricName: "Active Engagements", unit: "count",
      chartType: "line", trendDirection: "up", currentValue: 8,
      points: makePoints([5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8], start),
    },
    {
      id: "m-fd-util", nodeId: "node-forward-deployed", metricName: "Utilization", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 82,
      points: [{ timestamp: new Date().toISOString(), value: 82 }],
    },
  ],
  "node-lifecycle-playbooks": [
    {
      id: "m-pb-active", nodeId: "node-lifecycle-playbooks", metricName: "Active Playbooks", unit: "count",
      chartType: "bar", trendDirection: "up", currentValue: 24,
      points: makePoints([18, 19, 20, 21, 21, 22, 22, 23, 23, 23, 24, 24, 24, 24], start),
    },
    {
      id: "m-pb-comp", nodeId: "node-lifecycle-playbooks", metricName: "Completion Rate", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 89,
      points: [{ timestamp: new Date().toISOString(), value: 89 }],
    },
  ],
  "node-deployment-intelligence": [
    {
      id: "m-di-risk", nodeId: "node-deployment-intelligence", metricName: "Active Risk Flags", unit: "count",
      chartType: "line", trendDirection: "down", currentValue: 4,
      points: makePoints([8, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 4, 4, 4], start),
    },
    {
      id: "m-di-acc", nodeId: "node-deployment-intelligence", metricName: "Model Accuracy", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 92,
      points: [{ timestamp: new Date().toISOString(), value: 92 }],
    },
  ],
  "node-data-orchestration": [
    {
      id: "m-do-eps", nodeId: "node-data-orchestration", metricName: "Events per Second", unit: "k/s",
      chartType: "line", trendDirection: "up", currentValue: 12.4, delta: 1.1,
      points: makePoints([10.1, 10.4, 10.8, 11.0, 11.2, 11.5, 11.8, 12.0, 12.1, 12.2, 12.3, 12.4, 12.4, 12.4], start),
    },
    {
      id: "m-do-pipe", nodeId: "node-data-orchestration", metricName: "Pipelines by Status", unit: "count",
      chartType: "bar", currentValue: 42,
      points: [
        { timestamp: "ok", value: 38, label: "Healthy" },
        { timestamp: "warn", value: 3, label: "Warning" },
        { timestamp: "err", value: 1, label: "Failed" },
      ],
    },
    {
      id: "m-do-uptime", nodeId: "node-data-orchestration", metricName: "Uptime", unit: "%",
      chartType: "radial", trendDirection: "flat", currentValue: 99.8,
      points: [{ timestamp: new Date().toISOString(), value: 99.8 }],
    },
  ],
  "node-decisioning": [
    {
      id: "m-dec-day", nodeId: "node-decisioning", metricName: "Decisions per Day", unit: "k",
      chartType: "line", trendDirection: "up", currentValue: 8.9, delta: 0.4,
      points: makePoints([7.5, 7.8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.9, 8.9], start),
    },
    {
      id: "m-dec-acc", nodeId: "node-decisioning", metricName: "Model Accuracy", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 91,
      points: [{ timestamp: new Date().toISOString(), value: 91 }],
    },
  ],
  "node-compliance": [
    {
      id: "m-cmp-events", nodeId: "node-compliance", metricName: "Audit Events / day", unit: "k",
      chartType: "line", trendDirection: "up", currentValue: 220,
      points: makePoints([180, 185, 190, 195, 200, 205, 208, 210, 213, 215, 217, 219, 220, 220], start),
    },
    {
      id: "m-cmp-score", nodeId: "node-compliance", metricName: "Compliance Score", unit: "%",
      chartType: "radial", trendDirection: "flat", currentValue: 98,
      points: [{ timestamp: new Date().toISOString(), value: 98 }],
    },
  ],
  "node-partner-hub": [
    {
      id: "m-ph-active", nodeId: "node-partner-hub", metricName: "Active Partners", unit: "count",
      chartType: "line", trendDirection: "up", currentValue: 34,
      points: makePoints([28, 29, 30, 30, 31, 31, 32, 32, 33, 33, 34, 34, 34, 34], start),
    },
    {
      id: "m-ph-arr", nodeId: "node-partner-hub", metricName: "Partner Health", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 79,
      points: [{ timestamp: new Date().toISOString(), value: 79 }],
    },
  ],
  "node-analytics": [
    {
      id: "m-an-rep", nodeId: "node-analytics", metricName: "Active Reports", unit: "count",
      chartType: "line", trendDirection: "up", currentValue: 142,
      points: makePoints([120, 124, 127, 130, 132, 134, 136, 138, 139, 140, 141, 142, 142, 142], start),
    },
    {
      id: "m-an-fresh", nodeId: "node-analytics", metricName: "Data Freshness", unit: "%",
      chartType: "radial", trendDirection: "flat", currentValue: 93,
      points: [{ timestamp: new Date().toISOString(), value: 93 }],
    },
  ],
  "node-crm": [
    {
      id: "m-crm-acct", nodeId: "node-crm", metricName: "Account Records", unit: "count",
      chartType: "line", trendDirection: "up", currentValue: 1842,
      points: makePoints([1700, 1720, 1740, 1750, 1770, 1780, 1790, 1800, 1810, 1820, 1830, 1840, 1842, 1842], start),
    },
    {
      id: "m-crm-q", nodeId: "node-crm", metricName: "Data Quality", unit: "%",
      chartType: "radial", trendDirection: "up", currentValue: 96,
      points: [{ timestamp: new Date().toISOString(), value: 96 }],
    },
  ],
  "node-case-management": [
    {
      id: "m-cm-open", nodeId: "node-case-management", metricName: "Open Cases", unit: "count",
      chartType: "line", trendDirection: "down", currentValue: 27,
      points: makePoints([41, 39, 37, 36, 35, 34, 32, 31, 30, 29, 28, 27, 27, 27], start),
    },
    {
      id: "m-cm-cat", nodeId: "node-case-management", metricName: "Cases by Category", unit: "count",
      chartType: "bar", currentValue: 27,
      points: [
        { timestamp: "bug", value: 11, label: "Bug" },
        { timestamp: "howto", value: 8, label: "How-to" },
        { timestamp: "billing", value: 4, label: "Billing" },
        { timestamp: "outage", value: 4, label: "Outage" },
      ],
    },
  ],
  "node-document": [
    {
      id: "m-doc-q", nodeId: "node-document", metricName: "Search Queries / day", unit: "count",
      chartType: "line", trendDirection: "up", currentValue: 890,
      points: makePoints([700, 720, 745, 760, 780, 800, 820, 835, 850, 865, 875, 880, 888, 890], start),
    },
    {
      id: "m-doc-h", nodeId: "node-document", metricName: "Index Health", unit: "%",
      chartType: "radial", trendDirection: "flat", currentValue: 86,
      points: [{ timestamp: new Date().toISOString(), value: 86 }],
    },
  ],
  "node-api-gateway": [
    {
      id: "m-api-calls", nodeId: "node-api-gateway", metricName: "API Calls / day", unit: "M",
      chartType: "line", trendDirection: "up", currentValue: 2.1, delta: 0.2,
      points: makePoints([1.6, 1.65, 1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2.0, 2.05, 2.07, 2.08, 2.1, 2.1], start),
    },
    {
      id: "m-api-uptime", nodeId: "node-api-gateway", metricName: "Uptime", unit: "%",
      chartType: "radial", trendDirection: "flat", currentValue: 99.95,
      points: [{ timestamp: new Date().toISOString(), value: 99.95 }],
    },
  ],
};
