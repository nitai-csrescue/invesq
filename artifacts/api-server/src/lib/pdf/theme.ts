// Design tokens for the branded "CS Rescue" Diagnostic Report PDF.
// These are the exact values supplied by the user (2026-07-10 correction) —
// do NOT approximate or substitute nearby Tailwind/shadcn colors.

export const COLORS = {
  navy500: "#1E3A5F",
  navy600: "#1A3354",
  navy700: "#142943",
  navy800: "#0F1E30",

  orange500: "#E8681A",
  orange600: "#CF5910",

  slate200: "#E1E7EF",
  slate500: "#647488",
  slate700: "#344256",
  slate900: "#111C28",

  success500: "#16A34A",
  success700: "#15803D",
  success50: "#ECFDF3",

  warning500: "#F59E0B",
  warning700: "#B4730B",
  warning50: "#FEF6E7",

  danger500: "#DC2626",
  danger700: "#B01B1B",
  danger50: "#FDECEC",

  info500: "#2563EB",

  // Not part of the supplied token list — no exact hex was given for the
  // "NA / Insufficient Data" status. Modeled as a neutral gray family to sit
  // alongside success/warning/danger without implying it's a 4th "real"
  // brand color. Flagged to the user as an assumption.
  neutral500: "#647488", // reuses slate-500
  neutral700: "#475569",
  neutral50: "#F1F5F9",

  white: "#FFFFFF",
} as const;

export const RADII = {
  lg: "14px",
  md: "10px",
  pill: "999px",
} as const;

export const FONTS = {
  serif: "'Source Serif 4', Georgia, serif",
  sans: "'Public Sans', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace",
} as const;

// Fixed, spec-given score-status treatment. Labels are the exact wording
// from the spec (note: this intentionally differs from
// `@workspace/portfolio-engine`'s SCORE_LEVELS.label, which uses
// "Developing" for score 1 — the client-facing report always says
// "Partial" per the report spec, so it is hardcoded here rather than
// reused from the app's internal in-product labels).
export interface ScoreStatus {
  key: "0" | "1" | "2" | "na";
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const SCORE_STATUS: Record<"0" | "1" | "2" | "na", ScoreStatus> = {
  "2": { key: "2", label: "Optimized", text: COLORS.success700, bg: COLORS.success50, border: COLORS.success500 },
  "1": { key: "1", label: "Partial", text: COLORS.warning700, bg: COLORS.warning50, border: COLORS.warning500 },
  "0": { key: "0", label: "Infrastructure Gap", text: COLORS.danger700, bg: COLORS.danger50, border: COLORS.danger500 },
  na: { key: "na", label: "Insufficient Data", text: COLORS.neutral700, bg: COLORS.neutral50, border: COLORS.neutral500 },
};

export function scoreStatusFor(score: number | "NA" | null): ScoreStatus {
  if (score === "NA" || score === null) return SCORE_STATUS.na;
  return SCORE_STATUS[String(score) as "0" | "1" | "2"];
}

// Orange four-point sparkle/star glyph used as the accent bullet mark
// throughout (spec: "a four-point sparkle/star character").
export const SPARKLE = "\u2726"; // ✦ BLACK FOUR POINTED STAR

export const TOTAL_PAGES = 7;
