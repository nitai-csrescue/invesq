export type AccountId = string;
export type AccountStatus = "healthy" | "watch" | "at-risk" | "churning";
export type AccountSegment = "Enterprise" | "Mid-Market" | "SMB";

export interface ActivityEvent {
  id: string;
  at: string;
  type: "meeting" | "ticket" | "usage" | "renewal" | "expansion" | "email";
  summary: string;
}

export interface Account {
  id: AccountId;
  name: string;
  segment: AccountSegment;
  arr: number;
  healthScore: number;
  healthTrend: number[];
  status: AccountStatus;
  renewalDate: string;
  expansionPotential: number;
  ownerId: string;
  industry: string;
  riskFactors: string[];
  expansionIndicators: string[];
  recentActivity: ActivityEvent[];
  recommendedActionIds: string[];
  usageTrend: number[];
  weeklyActiveUsers: number;
  weeklyActiveUsersDelta: number;
  seatsLicensed: number;
  seatsActive: number;
  daysToRenewal: number;
}

const today = new Date("2026-04-22");
function daysFromNow(d: number) {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

function trend(start: number, end: number, n = 12): number[] {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(start + step * i + (Math.sin(i * 1.3) * 3)));
}

export const accounts: Account[] = [
  {
    id: "a_wayne",
    name: "Wayne Enterprises",
    segment: "Enterprise",
    arr: 480000,
    healthScore: 38,
    healthTrend: trend(72, 38),
    status: "at-risk",
    renewalDate: daysFromNow(42),
    expansionPotential: 0,
    ownerId: "u_alex",
    industry: "Conglomerate",
    riskFactors: [
      "Core feature adoption dropped 41% in 30 days",
      "Executive sponsor left in March",
      "Two P1 support tickets unresolved >7 days",
    ],
    expansionIndicators: [],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-2), type: "ticket", summary: "P1 ticket #4821 escalated — auth outage on prod tenant" },
      { id: "ev2", at: daysFromNow(-5), type: "meeting", summary: "QBR rescheduled for the 3rd time" },
      { id: "ev3", at: daysFromNow(-9), type: "usage", summary: "Weekly active users fell from 312 → 184" },
    ],
    recommendedActionIds: ["act_wayne_exec", "act_wayne_p1"],
    usageTrend: trend(310, 184),
    weeklyActiveUsers: 184,
    weeklyActiveUsersDelta: -41,
    seatsLicensed: 450,
    seatsActive: 184,
    daysToRenewal: 42,
  },
  {
    id: "a_stark",
    name: "Stark Industries",
    segment: "Enterprise",
    arr: 720000,
    healthScore: 91,
    healthTrend: trend(78, 91),
    status: "healthy",
    renewalDate: daysFromNow(180),
    expansionPotential: 240000,
    ownerId: "u_priya",
    industry: "Defense / Tech",
    riskFactors: [],
    expansionIndicators: [
      "Added 3 new business units in Q1",
      "Power users 3x platform median",
      "Engineering team requested enterprise SSO add-on",
    ],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-1), type: "expansion", summary: "Buying committee asked for enterprise tier pricing" },
      { id: "ev2", at: daysFromNow(-4), type: "usage", summary: "Crossed 1,200 weekly active users — all-time high" },
    ],
    recommendedActionIds: ["act_stark_expand"],
    usageTrend: trend(820, 1240),
    weeklyActiveUsers: 1240,
    weeklyActiveUsersDelta: 18,
    seatsLicensed: 1500,
    seatsActive: 1240,
    daysToRenewal: 180,
  },
  {
    id: "a_acme",
    name: "Acme Corp",
    segment: "Mid-Market",
    arr: 96000,
    healthScore: 52,
    healthTrend: trend(68, 52),
    status: "watch",
    renewalDate: daysFromNow(67),
    expansionPotential: 24000,
    ownerId: "u_kenji",
    industry: "Manufacturing",
    riskFactors: [
      "Adoption stalled at 4 of 12 modules",
      "Champion changed roles internally",
    ],
    expansionIndicators: [
      "Operations team asked about API access",
    ],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-3), type: "email", summary: "New champion identified: Director of Ops" },
    ],
    recommendedActionIds: ["act_acme_adopt"],
    usageTrend: trend(120, 95),
    weeklyActiveUsers: 95,
    weeklyActiveUsersDelta: -8,
    seatsLicensed: 200,
    seatsActive: 95,
    daysToRenewal: 67,
  },
  {
    id: "a_umbrella",
    name: "Umbrella Co.",
    segment: "Enterprise",
    arr: 540000,
    healthScore: 28,
    healthTrend: trend(60, 28),
    status: "churning",
    renewalDate: daysFromNow(21),
    expansionPotential: 0,
    ownerId: "u_alex",
    industry: "Pharmaceuticals",
    riskFactors: [
      "Renewal in 21 days, no QBR booked",
      "License utilization 22%",
      "Procurement asked for pricing comparison",
    ],
    expansionIndicators: [],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-6), type: "renewal", summary: "Procurement requested vendor consolidation review" },
    ],
    recommendedActionIds: ["act_umbrella_save"],
    usageTrend: trend(180, 64),
    weeklyActiveUsers: 64,
    weeklyActiveUsersDelta: -28,
    seatsLicensed: 300,
    seatsActive: 64,
    daysToRenewal: 21,
  },
  {
    id: "a_initech",
    name: "Initech",
    segment: "Mid-Market",
    arr: 84000,
    healthScore: 71,
    healthTrend: trend(64, 71),
    status: "healthy",
    renewalDate: daysFromNow(120),
    expansionPotential: 18000,
    ownerId: "u_lena",
    industry: "Software",
    riskFactors: [],
    expansionIndicators: ["Added 2 new departments to workspace"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-7), type: "usage", summary: "Adoption playbook completed all milestones" },
    ],
    recommendedActionIds: [],
    usageTrend: trend(200, 245),
    weeklyActiveUsers: 245,
    weeklyActiveUsersDelta: 12,
    seatsLicensed: 300,
    seatsActive: 245,
    daysToRenewal: 120,
  },
  {
    id: "a_hooli",
    name: "Hooli",
    segment: "Enterprise",
    arr: 660000,
    healthScore: 84,
    healthTrend: trend(78, 84),
    status: "healthy",
    renewalDate: daysFromNow(95),
    expansionPotential: 180000,
    ownerId: "u_priya",
    industry: "Tech",
    riskFactors: [],
    expansionIndicators: [
      "Marketing org asked about analytics module",
      "POC on advanced AI features",
    ],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-2), type: "expansion", summary: "Analytics POC kicked off with marketing org" },
    ],
    recommendedActionIds: ["act_hooli_expand"],
    usageTrend: trend(680, 940),
    weeklyActiveUsers: 940,
    weeklyActiveUsersDelta: 9,
    seatsLicensed: 1100,
    seatsActive: 940,
    daysToRenewal: 95,
  },
  {
    id: "a_cyberdyne",
    name: "Cyberdyne Systems",
    segment: "Enterprise",
    arr: 380000,
    healthScore: 47,
    healthTrend: trend(70, 47),
    status: "at-risk",
    renewalDate: daysFromNow(58),
    expansionPotential: 0,
    ownerId: "u_alex",
    industry: "Robotics",
    riskFactors: [
      "Support escalations up 3x quarter-over-quarter",
      "Two key admins inactive 45+ days",
    ],
    expansionIndicators: [],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-4), type: "ticket", summary: "P2 ticket queue grew from 3 → 11 in 2 weeks" },
    ],
    recommendedActionIds: ["act_cyberdyne_health"],
    usageTrend: trend(280, 195),
    weeklyActiveUsers: 195,
    weeklyActiveUsersDelta: -19,
    seatsLicensed: 500,
    seatsActive: 195,
    daysToRenewal: 58,
  },
  {
    id: "a_massive",
    name: "Massive Dynamic",
    segment: "Enterprise",
    arr: 510000,
    healthScore: 88,
    healthTrend: trend(80, 88),
    status: "healthy",
    renewalDate: daysFromNow(220),
    expansionPotential: 150000,
    ownerId: "u_priya",
    industry: "R&D",
    riskFactors: [],
    expansionIndicators: ["3 new use cases identified by champion"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-8), type: "meeting", summary: "Joint roadmap session with platform team" },
    ],
    recommendedActionIds: ["act_massive_expand"],
    usageTrend: trend(560, 720),
    weeklyActiveUsers: 720,
    weeklyActiveUsersDelta: 6,
    seatsLicensed: 900,
    seatsActive: 720,
    daysToRenewal: 220,
  },
  {
    id: "a_soylent",
    name: "Soylent Corp",
    segment: "Mid-Market",
    arr: 144000,
    healthScore: 33,
    healthTrend: trend(55, 33),
    status: "at-risk",
    renewalDate: daysFromNow(36),
    expansionPotential: 0,
    ownerId: "u_kenji",
    industry: "CPG",
    riskFactors: [
      "NPS score dropped from 8 → 4",
      "Champion went on extended leave",
      "Login frequency halved",
    ],
    expansionIndicators: [],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-3), type: "email", summary: "Renewal owner unresponsive for 14 days" },
    ],
    recommendedActionIds: ["act_soylent_save"],
    usageTrend: trend(140, 72),
    weeklyActiveUsers: 72,
    weeklyActiveUsersDelta: -22,
    seatsLicensed: 250,
    seatsActive: 72,
    daysToRenewal: 36,
  },
  {
    id: "a_pied_piper",
    name: "Pied Piper",
    segment: "SMB",
    arr: 36000,
    healthScore: 79,
    healthTrend: trend(58, 79),
    status: "healthy",
    renewalDate: daysFromNow(150),
    expansionPotential: 12000,
    ownerId: "u_jordan",
    industry: "Tech",
    riskFactors: [],
    expansionIndicators: ["Headcount grew 40% in Q1", "Asked about volume pricing"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-5), type: "expansion", summary: "Inbound: 25 more seats requested for engineering" },
    ],
    recommendedActionIds: ["act_pp_expand"],
    usageTrend: trend(45, 78),
    weeklyActiveUsers: 78,
    weeklyActiveUsersDelta: 24,
    seatsLicensed: 80,
    seatsActive: 78,
    daysToRenewal: 150,
  },
  {
    id: "a_globex",
    name: "Globex",
    segment: "Mid-Market",
    arr: 132000,
    healthScore: 64,
    healthTrend: trend(70, 64),
    status: "watch",
    renewalDate: daysFromNow(89),
    expansionPotential: 36000,
    ownerId: "u_lena",
    industry: "Logistics",
    riskFactors: ["Champion split attention to new initiative"],
    expansionIndicators: ["Operations team piloting workflows feature"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-6), type: "meeting", summary: "Quarterly check-in held; renewal in good shape" },
    ],
    recommendedActionIds: ["act_globex_check"],
    usageTrend: trend(180, 168),
    weeklyActiveUsers: 168,
    weeklyActiveUsersDelta: -3,
    seatsLicensed: 250,
    seatsActive: 168,
    daysToRenewal: 89,
  },
  {
    id: "a_vandelay",
    name: "Vandelay Industries",
    segment: "Mid-Market",
    arr: 78000,
    healthScore: 56,
    healthTrend: trend(62, 56),
    status: "watch",
    renewalDate: daysFromNow(48),
    expansionPotential: 14000,
    ownerId: "u_kenji",
    industry: "Import/Export",
    riskFactors: ["Stalled on integration setup for 30 days"],
    expansionIndicators: [],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-10), type: "ticket", summary: "Integration ticket open since March" },
    ],
    recommendedActionIds: ["act_vandelay_unblock"],
    usageTrend: trend(110, 102),
    weeklyActiveUsers: 102,
    weeklyActiveUsersDelta: -7,
    seatsLicensed: 150,
    seatsActive: 102,
    daysToRenewal: 48,
  },
  {
    id: "a_tyrell",
    name: "Tyrell Corp",
    segment: "Enterprise",
    arr: 600000,
    healthScore: 93,
    healthTrend: trend(85, 93),
    status: "healthy",
    renewalDate: daysFromNow(260),
    expansionPotential: 220000,
    ownerId: "u_priya",
    industry: "Bioengineering",
    riskFactors: [],
    expansionIndicators: ["Strong executive sponsorship", "Renewing platform-wide"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-1), type: "meeting", summary: "Renewal kickoff scheduled — 25% expansion on the table" },
    ],
    recommendedActionIds: ["act_tyrell_expand"],
    usageTrend: trend(700, 905),
    weeklyActiveUsers: 905,
    weeklyActiveUsersDelta: 11,
    seatsLicensed: 1100,
    seatsActive: 905,
    daysToRenewal: 260,
  },
  {
    id: "a_ingen",
    name: "InGen",
    segment: "Mid-Market",
    arr: 108000,
    healthScore: 41,
    healthTrend: trend(60, 41),
    status: "at-risk",
    renewalDate: daysFromNow(75),
    expansionPotential: 0,
    ownerId: "u_lena",
    industry: "Biotech",
    riskFactors: [
      "Onboarding incomplete after 90 days",
      "Champion has not attended last 3 weekly syncs",
    ],
    expansionIndicators: [],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-4), type: "usage", summary: "Only 3 of 8 onboarding milestones complete" },
    ],
    recommendedActionIds: ["act_ingen_onboard"],
    usageTrend: trend(95, 60),
    weeklyActiveUsers: 60,
    weeklyActiveUsersDelta: -16,
    seatsLicensed: 180,
    seatsActive: 60,
    daysToRenewal: 75,
  },
  {
    id: "a_sterling",
    name: "Sterling Cooper",
    segment: "SMB",
    arr: 24000,
    healthScore: 68,
    healthTrend: trend(60, 68),
    status: "healthy",
    renewalDate: daysFromNow(165),
    expansionPotential: 8000,
    ownerId: "u_jordan",
    industry: "Marketing",
    riskFactors: [],
    expansionIndicators: ["New creative team interested"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-12), type: "email", summary: "Account manager asked about adding content module" },
    ],
    recommendedActionIds: [],
    usageTrend: trend(40, 52),
    weeklyActiveUsers: 52,
    weeklyActiveUsersDelta: 4,
    seatsLicensed: 60,
    seatsActive: 52,
    daysToRenewal: 165,
  },
  {
    id: "a_blackmesa",
    name: "Black Mesa",
    segment: "Enterprise",
    arr: 420000,
    healthScore: 76,
    healthTrend: trend(72, 76),
    status: "healthy",
    renewalDate: daysFromNow(140),
    expansionPotential: 90000,
    ownerId: "u_alex",
    industry: "Research",
    riskFactors: [],
    expansionIndicators: ["Lab teams adopted analytics module"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-9), type: "usage", summary: "Adoption crossed 80% of provisioned seats" },
    ],
    recommendedActionIds: [],
    usageTrend: trend(420, 510),
    weeklyActiveUsers: 510,
    weeklyActiveUsersDelta: 7,
    seatsLicensed: 700,
    seatsActive: 510,
    daysToRenewal: 140,
  },
  {
    id: "a_aperture",
    name: "Aperture Labs",
    segment: "Mid-Market",
    arr: 156000,
    healthScore: 82,
    healthTrend: trend(70, 82),
    status: "healthy",
    renewalDate: daysFromNow(110),
    expansionPotential: 42000,
    ownerId: "u_kenji",
    industry: "R&D",
    riskFactors: [],
    expansionIndicators: ["Considering platform tier upgrade"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-3), type: "expansion", summary: "Pricing conversation initiated for platform tier" },
    ],
    recommendedActionIds: ["act_aperture_pricing"],
    usageTrend: trend(180, 248),
    weeklyActiveUsers: 248,
    weeklyActiveUsersDelta: 14,
    seatsLicensed: 320,
    seatsActive: 248,
    daysToRenewal: 110,
  },
  {
    id: "a_nakatomi",
    name: "Nakatomi Trading",
    segment: "Enterprise",
    arr: 312000,
    healthScore: 59,
    healthTrend: trend(74, 59),
    status: "watch",
    renewalDate: daysFromNow(82),
    expansionPotential: 28000,
    ownerId: "u_sam",
    industry: "Financial Services",
    riskFactors: ["Compliance review delayed enterprise rollout"],
    expansionIndicators: ["Trading desk piloting real-time module"],
    recentActivity: [
      { id: "ev1", at: daysFromNow(-7), type: "meeting", summary: "Security/compliance walkthrough scheduled" },
    ],
    recommendedActionIds: ["act_nakatomi_security"],
    usageTrend: trend(380, 320),
    weeklyActiveUsers: 320,
    weeklyActiveUsersDelta: -5,
    seatsLicensed: 600,
    seatsActive: 320,
    daysToRenewal: 82,
  },
];

export function getAccount(id: AccountId): Account | undefined {
  return accounts.find((a) => a.id === id);
}

export const atRiskAccounts = () =>
  accounts.filter((a) => a.status === "at-risk" || a.status === "churning")
    .sort((a, b) => a.healthScore - b.healthScore);

export const expansionAccounts = () =>
  accounts.filter((a) => a.expansionPotential > 0)
    .sort((a, b) => b.expansionPotential - a.expansionPotential);

export const renewingSoon = (days: number = 60) =>
  accounts.filter((a) => a.daysToRenewal <= days).sort((a, b) => a.daysToRenewal - b.daysToRenewal);
