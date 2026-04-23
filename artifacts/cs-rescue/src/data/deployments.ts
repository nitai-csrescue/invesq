import type { Deployment, DeploymentStage } from "@workspace/api-client-react";
import { accounts, type Account as DemoAccount } from "./accounts";

interface DeploymentSpec {
  name: string;
  stage: DeploymentStage;
}

const DEPLOYMENT_SPECS: Record<string, DeploymentSpec> = {
  a_wayne: { name: "Wayne Auth Modernization", stage: "implementation" },
  a_stark: { name: "Stark SSO Expansion", stage: "csm" },
  a_acme: { name: "Acme Adoption Push", stage: "csm" },
  a_umbrella: { name: "Umbrella Renewal Save", stage: "support" },
  a_initech: { name: "Initech Workspace Rollout", stage: "csm" },
  a_hooli: { name: "Hooli Analytics POC", stage: "csm" },
  a_cyberdyne: { name: "Cyberdyne Health Recovery", stage: "csm" },
  a_massive: { name: "Massive Roadmap Sync", stage: "csm" },
  a_soylent: { name: "Soylent Save Plan", stage: "support" },
  a_pied_piper: { name: "Pied Piper Seat Expansion", stage: "csm" },
  a_globex: { name: "Globex Workflows Pilot", stage: "csm" },
  a_vandelay: { name: "Vandelay Integration Unblock", stage: "implementation" },
  a_tyrell: { name: "Tyrell Renewal Kickoff", stage: "csm" },
  a_ingen: { name: "InGen Onboarding Recovery", stage: "implementation" },
  a_sterling: { name: "Sterling Content Module", stage: "csm" },
  a_blackmesa: { name: "Black Mesa Analytics Adoption", stage: "csm" },
  a_aperture: { name: "Aperture Tier Upgrade", stage: "csm" },
  a_nakatomi: { name: "Nakatomi Compliance Rollout", stage: "implementation" },
};

const today = new Date("2026-04-22");
function addDays(d: number): string {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

function severityFor(account: DemoAccount): "critical" | "high" | "medium" | "low" {
  if (account.healthScore < 35) return "critical";
  if (account.healthScore < 50) return "high";
  if (account.healthScore < 65) return "medium";
  return "low";
}

function buildDeployment(a: DemoAccount): Deployment {
  const spec = DEPLOYMENT_SPECS[a.id] ?? { name: `${a.name} Rollout`, stage: "csm" as DeploymentStage };
  const blockerSeverity = severityFor(a);
  const blockers = a.riskFactors.slice(0, 3).map((rf, i) => ({
    id: `blk_${a.id}_${i}`,
    description: rf,
    severity: blockerSeverity,
    status: "open" as const,
    owner: a.ownerId,
  }));

  const upcomingDays = Math.max(7, Math.min(a.daysToRenewal - 14, 45));
  const adoptionMilestoneName =
    a.status === "healthy" || a.status === "watch"
      ? a.expansionPotential > 0
        ? "Expansion Discovery"
        : "Adoption Checkpoint"
      : "Recovery Plan Review";

  const milestones = [
    {
      id: `ms_${a.id}_kickoff`,
      name: "Kickoff",
      status: "completed" as const,
      dueDate: addDays(-90),
      completedAt: addDays(-88),
    },
    {
      id: `ms_${a.id}_qbr`,
      name: "Quarterly Business Review",
      status: "completed" as const,
      dueDate: addDays(-30),
      completedAt: addDays(-30),
    },
    {
      id: `ms_${a.id}_next`,
      name: adoptionMilestoneName,
      status: a.status === "churning" ? ("blocked" as const) : ("in_progress" as const),
      dueDate: addDays(upcomingDays),
      completedAt: null,
    },
    {
      id: `ms_${a.id}_renewal`,
      name: "Renewal Review",
      status: "pending" as const,
      dueDate: addDays(a.daysToRenewal),
      completedAt: null,
    },
  ];

  const seatProgress = Math.round(
    (a.seatsActive / Math.max(a.seatsLicensed, 1)) * 100,
  );

  return {
    id: `dep_${a.id}`,
    accountId: a.id,
    accountName: a.name,
    name: spec.name,
    stage: spec.stage,
    architectureNodeIds: [],
    resourceIds: [],
    blockers,
    milestones,
    healthScore: a.healthScore,
    startedAt: addDays(-90),
    estimatedCompletionAt: addDays(a.daysToRenewal),
    workstreams: [
      {
        id: `ws_${a.id}_adoption`,
        name: "Adoption",
        status: a.status === "churning" ? ("paused" as const) : ("active" as const),
        owner: a.ownerId,
        progress: Math.max(0, Math.min(100, seatProgress)),
      },
      {
        id: `ws_${a.id}_motion`,
        name: a.expansionPotential > 0 ? "Expansion" : "Save Plan",
        status: "active" as const,
        owner: a.ownerId,
        progress: a.expansionPotential > 0 ? 30 : 55,
      },
    ],
  };
}

export const demoDeployments: Deployment[] = accounts.map(buildDeployment);

export function getDemoDeploymentsForAccount(accountId: string): Deployment[] {
  return demoDeployments.filter((d) => d.accountId === accountId);
}
