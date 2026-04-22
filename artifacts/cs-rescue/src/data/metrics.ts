import { accounts, atRiskAccounts, expansionAccounts } from "./accounts";

export interface KpiSnapshot {
  label: string;
  value: string;
  delta: string;
  deltaTone: "positive" | "negative" | "neutral";
  sparkline: number[];
  subtitle: string;
}

const totalArr = accounts.reduce((s, a) => s + a.arr, 0);
const atRiskArr = atRiskAccounts().reduce((s, a) => s + a.arr, 0);
const expansionArr = expansionAccounts().reduce((s, a) => s + a.expansionPotential, 0);
const avgHealth = Math.round(accounts.reduce((s, a) => s + a.healthScore, 0) / accounts.length);

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export const dashboardKpis: KpiSnapshot[] = [
  {
    label: "Portfolio Health",
    value: `${avgHealth}`,
    delta: "+4 pts",
    deltaTone: "positive",
    sparkline: [62, 64, 63, 66, 65, 67, 66, 68, 67, 69, 68, avgHealth],
    subtitle: "Avg across 18 accounts",
  },
  {
    label: "At-Risk ARR",
    value: fmtCurrency(atRiskArr),
    delta: `${atRiskAccounts().length} accounts`,
    deltaTone: "negative",
    sparkline: [820, 880, 900, 940, 980, 1020, 1060, 1100, 1180, 1240, 1300, atRiskArr / 1000],
    subtitle: "Health below 50",
  },
  {
    label: "Expansion Pipeline",
    value: fmtCurrency(expansionArr),
    delta: `${expansionAccounts().length} accounts`,
    deltaTone: "positive",
    sparkline: [620, 640, 720, 780, 820, 880, 940, 1000, 1080, 1160, 1220, expansionArr / 1000],
    subtitle: "Across 8 active opportunities",
  },
  {
    label: "Time to Value",
    value: "13 d",
    delta: "−8 days",
    deltaTone: "positive",
    sparkline: [21, 20, 19, 19, 18, 17, 17, 16, 15, 14, 14, 13],
    subtitle: "Median, last 90 days",
  },
  {
    label: "NRR Impact",
    value: "+$1.2M",
    delta: "this quarter",
    deltaTone: "positive",
    sparkline: [200, 280, 360, 460, 540, 640, 720, 820, 920, 1000, 1100, 1200],
    subtitle: "Saved + expanded ARR",
  },
];

export interface SeriesPoint { label: string; value: number; }

export const retentionTrend: SeriesPoint[] = [
  { label: "Wk 1", value: 92 }, { label: "Wk 2", value: 91 }, { label: "Wk 3", value: 92 },
  { label: "Wk 4", value: 93 }, { label: "Wk 5", value: 94 }, { label: "Wk 6", value: 94 },
  { label: "Wk 7", value: 95 }, { label: "Wk 8", value: 95 }, { label: "Wk 9", value: 96 },
  { label: "Wk 10", value: 96 }, { label: "Wk 11", value: 97 }, { label: "Wk 12", value: 97 },
];

export const expansionPipeline: SeriesPoint[] = [
  { label: "Identified", value: 12 },
  { label: "Qualified", value: 8 },
  { label: "Proposal", value: 5 },
  { label: "Closing", value: 3 },
  { label: "Closed", value: 2 },
];

export const playbookImpact: SeriesPoint[] = [
  { label: "Retention Save", value: 2100 },
  { label: "Expansion Plan", value: 1800 },
  { label: "Renewal Defense", value: 1450 },
  { label: "Adoption Workshop", value: 920 },
  { label: "Re-Onboarding", value: 410 },
  { label: "QBR", value: 380 },
];

export const ttvTrend: SeriesPoint[] = [
  { label: "Q1 '25", value: 24 },
  { label: "Q2 '25", value: 22 },
  { label: "Q3 '25", value: 20 },
  { label: "Q4 '25", value: 18 },
  { label: "Q1 '26", value: 15 },
  { label: "Q2 '26", value: 13 },
];

export const teamCapacity = [
  { name: "Alex Morgan", role: "Head of CS", capacity: 78, accounts: 4 },
  { name: "Priya Shah", role: "Senior CSM", capacity: 92, accounts: 5 },
  { name: "Kenji Tanaka", role: "CSM", capacity: 67, accounts: 4 },
  { name: "Lena Brandt", role: "CSM", capacity: 71, accounts: 4 },
  { name: "Jordan Rivera", role: "Onboarding Lead", capacity: 54, accounts: 3 },
  { name: "Sam Olin", role: "Renewals Manager", capacity: 81, accounts: 2 },
];

export { totalArr };
