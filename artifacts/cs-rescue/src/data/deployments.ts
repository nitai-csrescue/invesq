import type { Deployment, DeploymentStage } from "@workspace/api-client-react";
import { accounts, type Account as DemoAccount } from "./accounts";

interface DeploymentSpec {
  /** Suffix appended to `dep_${accountId}` to form the deployment id. Empty for the primary rollout. */
  suffix?: string;
  name: string;
  stage: DeploymentStage;
  /** Adjustment to the account's base health score, clamped to 0–100. */
  healthDelta?: number;
  /** Optional override for the next adoption-phase milestone label. */
  nextMilestoneName?: string;
  /** Optional override for the secondary workstream label. */
  motionLabel?: string;
  /**
   * Architecture node IDs (from the live API graph) this rollout touches.
   * Surfaced by the Copilot "Walk the systems backing {deployment}" line.
   * 2–4 IDs; must match nodes in `artifacts/api-server/src/data/mockData.ts`.
   */
  architectureNodeIds?: string[];
  /**
   * Resource IDs (from the live API graph) this rollout depends on.
   * Feeds the Copilot recommended-resources section. 2–3 IDs; must match
   * resources in `artifacts/api-server/src/data/mockData.ts`.
   */
  resourceIds?: string[];
}

/** Fallback node/resource wiring per stage, used when a spec omits explicit IDs. */
const STAGE_DEFAULT_WIRING: Record<
  DeploymentStage,
  { architectureNodeIds: string[]; resourceIds: string[] }
> = {
  pre_sales: {
    architectureNodeIds: ["node-pre-sales", "node-crm"],
    resourceIds: ["res-salesforce", "res-hubspot"],
  },
  contracting: {
    architectureNodeIds: ["node-contract", "node-document"],
    resourceIds: ["res-docusign", "res-salesforce"],
  },
  implementation: {
    architectureNodeIds: ["node-implementation", "node-forward-deployed", "node-lifecycle-playbooks"],
    resourceIds: ["res-jira", "res-confluence", "res-internal-api"],
  },
  csm: {
    architectureNodeIds: ["node-csm", "node-lifecycle-playbooks", "node-analytics"],
    resourceIds: ["res-salesforce", "res-looker"],
  },
  support: {
    architectureNodeIds: ["node-support", "node-case-management", "node-document"],
    resourceIds: ["res-zendesk", "res-jira"],
  },
  completed: {
    architectureNodeIds: ["node-csm", "node-analytics"],
    resourceIds: ["res-salesforce", "res-looker"],
  },
};

const DEFAULT_SPEC: DeploymentSpec = { name: "Rollout", stage: "csm" };

const DEPLOYMENT_SPECS: Record<string, DeploymentSpec[]> = {
  a_wayne: [
    {
      name: "Wayne Auth Modernization",
      stage: "implementation",
      // Identity/auth cutover through the integration hub with compliance sign-off.
      architectureNodeIds: ["node-implementation", "node-api-gateway", "node-compliance"],
      resourceIds: ["res-identity", "res-internal-api"],
    },
  ],
  a_stark: [
    {
      name: "Stark SSO Expansion",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-api-gateway", "node-compliance"],
      resourceIds: ["res-identity", "res-salesforce"],
    },
    {
      suffix: "analytics",
      name: "Stark Analytics Rollout",
      stage: "implementation",
      healthDelta: -8,
      nextMilestoneName: "Analytics Pilot Review",
      motionLabel: "Analytics Adoption",
      architectureNodeIds: ["node-implementation", "node-analytics", "node-data-orchestration"],
      resourceIds: ["res-snowflake", "res-looker"],
    },
    {
      suffix: "renewal",
      name: "Stark Multi-Year Renewal",
      stage: "csm",
      healthDelta: 4,
      nextMilestoneName: "Renewal Proposal Review",
      motionLabel: "Renewal Motion",
      architectureNodeIds: ["node-csm", "node-contract", "node-lifecycle-playbooks"],
      resourceIds: ["res-salesforce", "res-docusign"],
    },
  ],
  a_acme: [
    {
      name: "Acme Adoption Push",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-lifecycle-playbooks", "node-analytics"],
      resourceIds: ["res-salesforce", "res-looker"],
    },
  ],
  a_umbrella: [
    {
      name: "Umbrella Renewal Save",
      stage: "support",
      architectureNodeIds: ["node-support", "node-csm", "node-case-management"],
      resourceIds: ["res-zendesk", "res-salesforce"],
    },
  ],
  a_initech: [
    {
      name: "Initech Workspace Rollout",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-implementation", "node-document"],
      resourceIds: ["res-confluence", "res-salesforce"],
    },
  ],
  a_hooli: [
    {
      name: "Hooli Analytics POC",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-analytics", "node-data-orchestration"],
      resourceIds: ["res-snowflake", "res-looker"],
    },
    {
      suffix: "sso",
      name: "Hooli SSO Migration",
      stage: "implementation",
      healthDelta: -6,
      nextMilestoneName: "SSO Cutover Review",
      motionLabel: "Identity Rollout",
      architectureNodeIds: ["node-implementation", "node-api-gateway", "node-compliance"],
      resourceIds: ["res-identity", "res-internal-api"],
    },
  ],
  a_cyberdyne: [
    {
      name: "Cyberdyne Health Recovery",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-deployment-intelligence", "node-lifecycle-playbooks"],
      resourceIds: ["res-salesforce", "res-internal-api"],
    },
  ],
  a_massive: [
    {
      name: "Massive Roadmap Sync",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-lifecycle-playbooks", "node-decisioning"],
      resourceIds: ["res-salesforce", "res-internal-api"],
    },
    {
      suffix: "expansion",
      name: "Massive Seat Expansion",
      stage: "csm",
      healthDelta: 3,
      motionLabel: "Expansion Motion",
      architectureNodeIds: ["node-csm", "node-partner-hub", "node-crm"],
      resourceIds: ["res-salesforce", "res-hubspot"],
    },
    {
      suffix: "compliance",
      name: "Massive Compliance Pack",
      stage: "implementation",
      healthDelta: -5,
      nextMilestoneName: "Compliance Review",
      motionLabel: "Compliance Rollout",
      architectureNodeIds: ["node-implementation", "node-compliance", "node-api-gateway"],
      resourceIds: ["res-identity", "res-snowflake"],
    },
  ],
  a_soylent: [
    {
      name: "Soylent Save Plan",
      stage: "support",
      architectureNodeIds: ["node-support", "node-csm", "node-case-management"],
      resourceIds: ["res-zendesk", "res-salesforce"],
    },
  ],
  a_pied_piper: [
    {
      name: "Pied Piper Seat Expansion",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-partner-hub", "node-crm"],
      resourceIds: ["res-salesforce", "res-hubspot"],
    },
  ],
  a_globex: [
    {
      name: "Globex Workflows Pilot",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-lifecycle-playbooks", "node-decisioning"],
      resourceIds: ["res-internal-api", "res-looker"],
    },
  ],
  a_vandelay: [
    {
      name: "Vandelay Integration Unblock",
      stage: "implementation",
      architectureNodeIds: ["node-implementation", "node-api-gateway", "node-data-orchestration"],
      resourceIds: ["res-internal-api", "res-kafka"],
    },
  ],
  a_tyrell: [
    {
      name: "Tyrell Renewal Kickoff",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-contract", "node-lifecycle-playbooks"],
      resourceIds: ["res-salesforce", "res-docusign"],
    },
    {
      suffix: "platform",
      name: "Tyrell Platform Upgrade",
      stage: "implementation",
      healthDelta: -4,
      nextMilestoneName: "Upgrade Cutover",
      motionLabel: "Platform Migration",
      architectureNodeIds: ["node-implementation", "node-api-gateway", "node-data-orchestration"],
      resourceIds: ["res-internal-api", "res-kafka"],
    },
  ],
  a_ingen: [
    {
      name: "InGen Onboarding Recovery",
      stage: "implementation",
      architectureNodeIds: ["node-implementation", "node-forward-deployed", "node-lifecycle-playbooks"],
      resourceIds: ["res-jira", "res-confluence"],
    },
  ],
  a_sterling: [
    {
      name: "Sterling Content Module",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-document", "node-lifecycle-playbooks"],
      resourceIds: ["res-confluence", "res-s3"],
    },
  ],
  a_blackmesa: [
    {
      name: "Black Mesa Analytics Adoption",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-analytics", "node-data-orchestration"],
      resourceIds: ["res-snowflake", "res-looker"],
    },
    {
      suffix: "research",
      name: "Black Mesa Research Workspace",
      stage: "implementation",
      healthDelta: -7,
      nextMilestoneName: "Research Pilot Review",
      motionLabel: "Workspace Rollout",
      architectureNodeIds: ["node-implementation", "node-document", "node-forward-deployed"],
      resourceIds: ["res-confluence", "res-s3"],
    },
  ],
  a_aperture: [
    {
      name: "Aperture Tier Upgrade",
      stage: "csm",
      architectureNodeIds: ["node-csm", "node-partner-hub", "node-crm"],
      resourceIds: ["res-salesforce", "res-hubspot"],
    },
  ],
  a_nakatomi: [
    {
      name: "Nakatomi Compliance Rollout",
      stage: "implementation",
      architectureNodeIds: ["node-implementation", "node-compliance", "node-api-gateway"],
      resourceIds: ["res-identity", "res-snowflake"],
    },
  ],
};

const today = new Date("2026-04-22");
function addDays(d: number): string {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

function severityFor(health: number): "critical" | "high" | "medium" | "low" {
  if (health < 35) return "critical";
  if (health < 50) return "high";
  if (health < 65) return "medium";
  return "low";
}

function clampHealth(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildDeployment(a: DemoAccount, spec: DeploymentSpec): Deployment {
  const idSuffix = spec.suffix ? `_${spec.suffix}` : "";
  const depId = `dep_${a.id}${idSuffix}`;
  const health = clampHealth(a.healthScore + (spec.healthDelta ?? 0));
  const blockerSeverity = severityFor(health);
  const blockers = a.riskFactors.slice(0, 3).map((rf, i) => ({
    id: `blk_${a.id}${idSuffix}_${i}`,
    description: rf,
    severity: blockerSeverity,
    status: "open" as const,
    owner: a.ownerId,
  }));

  const upcomingDays = Math.max(7, Math.min(a.daysToRenewal - 14, 45));
  const adoptionMilestoneName =
    spec.nextMilestoneName ??
    (a.status === "healthy" || a.status === "watch"
      ? a.expansionPotential > 0
        ? "Expansion Discovery"
        : "Adoption Checkpoint"
      : "Recovery Plan Review");

  const milestones = [
    {
      id: `ms_${a.id}${idSuffix}_kickoff`,
      name: "Kickoff",
      status: "completed" as const,
      dueDate: addDays(-90),
      completedAt: addDays(-88),
    },
    {
      id: `ms_${a.id}${idSuffix}_qbr`,
      name: "Quarterly Business Review",
      status: "completed" as const,
      dueDate: addDays(-30),
      completedAt: addDays(-30),
    },
    {
      id: `ms_${a.id}${idSuffix}_next`,
      name: adoptionMilestoneName,
      status: a.status === "churning" ? ("blocked" as const) : ("in_progress" as const),
      dueDate: addDays(upcomingDays),
      completedAt: null,
    },
    {
      id: `ms_${a.id}${idSuffix}_renewal`,
      name: "Renewal Review",
      status: "pending" as const,
      dueDate: addDays(a.daysToRenewal),
      completedAt: null,
    },
  ];

  const seatProgress = Math.round(
    (a.seatsActive / Math.max(a.seatsLicensed, 1)) * 100,
  );

  const motionLabel = spec.motionLabel ?? (a.expansionPotential > 0 ? "Expansion" : "Save Plan");

  const wiring = STAGE_DEFAULT_WIRING[spec.stage];
  const architectureNodeIds = spec.architectureNodeIds ?? wiring.architectureNodeIds;
  const resourceIds = spec.resourceIds ?? wiring.resourceIds;

  return {
    id: depId,
    accountId: a.id,
    accountName: a.name,
    name: spec.name,
    stage: spec.stage,
    architectureNodeIds,
    resourceIds,
    blockers,
    milestones,
    healthScore: health,
    startedAt: addDays(-90),
    estimatedCompletionAt: addDays(a.daysToRenewal),
    workstreams: [
      {
        id: `ws_${a.id}${idSuffix}_adoption`,
        name: "Adoption",
        status: a.status === "churning" ? ("paused" as const) : ("active" as const),
        owner: a.ownerId,
        progress: Math.max(0, Math.min(100, seatProgress)),
      },
      {
        id: `ws_${a.id}${idSuffix}_motion`,
        name: motionLabel,
        status: "active" as const,
        owner: a.ownerId,
        progress: a.expansionPotential > 0 ? 30 : 55,
      },
    ],
  };
}

function buildDeploymentsFor(a: DemoAccount): Deployment[] {
  const specs = DEPLOYMENT_SPECS[a.id] ?? [{ ...DEFAULT_SPEC, name: `${a.name} Rollout` }];
  return specs.map((spec) => buildDeployment(a, spec));
}

export const demoDeployments: Deployment[] = accounts.flatMap(buildDeploymentsFor);

export function getDemoDeploymentsForAccount(accountId: string): Deployment[] {
  return demoDeployments.filter((d) => d.accountId === accountId);
}
